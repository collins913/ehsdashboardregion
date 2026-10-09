import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { OperationalEventInput } from "@/data/contracts/monitoring";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import { createMonitoringEventWrite, normalizeOperationalEventInput, operationalFingerprint } from "./operational-event";
import { MemoryMonitoringRepository } from "@/data/server/testing/memory-monitoring-repository";
import { dispatchNotificationOutbox, notificationIdempotencyKey, recordOperationalEvent } from "./monitoring-service.server";
import { RecordingNotificationProvider } from "@/data/server/testing/recording-notification-provider";
import { retryAtForAttempt, DEFAULT_NOTIFICATION_POLICY } from "./notification-policy";
import { evaluateJobWatchdog } from "./job-watchdog";

const at = (value: string) => value as TimezoneAwareIsoDateTime;
const event = (impactId: string | null = null): OperationalEventInput => ({
  environment: "test", source: "Repository", component: "Events Query", severity: "ERROR",
  errorCode: "REPOSITORY_QUERY_FAILED", safeMessage: "查询失败", phenomenon: "查询未完成。",
  causeStatus: "UNKNOWN", knownCause: null,
  impact: { kind: "STORE", id: impactId, summary: "门店范围查询失败。" },
  actionTaken: "已记录。", nextStep: "检查数据源。", correlationId: "req-1",
  relatedBatchId: null, relatedJobId: null, relatedDomain: "events", diagnostics: [],
});

describe("Operational Event safety and incident identity", () => {
  it("redacts sensitive text and never carries an exception stack field", () => {
    const normalized = normalizeOperationalEventInput({ ...event(), safeMessage: "Bearer abcdefghijklmnop user@example.com", causeStatus: "KNOWN", knownCause: "password=supersecret" });
    expect(normalized.safeMessage).not.toContain("abcdefghijklmnop");
    expect(normalized.safeMessage).not.toContain("user@example.com");
    expect(normalized.knownCause).not.toContain("supersecret");
    expect("stack" in normalized).toBe(false);
  });

  it("fingerprints stable identity and separates distinct impact scopes", () => {
    expect(operationalFingerprint(event("store-1"))).toBe(operationalFingerprint(event("store-1")));
    expect(operationalFingerprint(event("store-1"))).not.toBe(operationalFingerprint(event("store-2")));
  });

  it("limits structured diagnostics and normalizes unknown codes", () => {
    const normalized = normalizeOperationalEventInput({ ...event(), errorCode: "free form error with token=secret", diagnostics: Array.from({ length: 30 }, (_, index) => ({ code: `DIAG_${index}`, severity: "WARNING" as const, message: "safe" })) });
    expect(normalized.errorCode).toBe("UNCLASSIFIED_FAILURE");
    expect(normalized.diagnostics).toHaveLength(20);
  });
});

describe("Monitoring incident and Outbox adapter contract", () => {
  let repository: MemoryMonitoringRepository;
  beforeEach(() => { repository = new MemoryMonitoringRepository(); vi.stubEnv("EHS_MONITORING_ALERT_RECIPIENTS", "ops@example.test"); });

  it("atomically appends occurrences and keeps unrelated impact scopes separate", async () => {
    const write1 = createMonitoringEventWrite(event("store-1"), at("2026-10-09T00:00:00.000Z"));
    const first = await repository.recordEvent(write1);
    const second = await repository.recordEvent(createMonitoringEventWrite(event("store-1"), at("2026-10-09T00:01:00.000Z"), write1.notification));
    const other = await repository.recordEvent(createMonitoringEventWrite(event("store-2"), at("2026-10-09T00:02:00.000Z")));
    expect(first.incident.incidentId).toBe(second.incident.incidentId);
    expect(second.incident.occurrenceCount).toBe(2);
    expect(other.incident.incidentId).not.toBe(first.incident.incidentId);
    const snapshot = await repository.listSnapshot({ status: "ALL" }, at("2026-10-09T00:03:00.000Z"));
    expect(snapshot.events).toHaveLength(3);
    expect(snapshot.incidents).toHaveLength(2);
  });

  it("creates at most one opening notification and throttles repeat summaries", async () => {
    const first = await repository.recordEvent(createMonitoringEventWrite(event("store-1"), at("2026-10-09T00:00:00.000Z"), { recipients: ["ops@example.test"], repeatIntervalMs: 60_000 }));
    await repository.recordEvent(createMonitoringEventWrite(event("store-1"), at("2026-10-09T00:00:30.000Z"), { recipients: ["ops@example.test"], repeatIntervalMs: 60_000 }));
    await repository.recordEvent(createMonitoringEventWrite(event("store-1"), at("2026-10-09T00:02:00.000Z"), { recipients: ["ops@example.test"], repeatIntervalMs: 60_000 }));
    const snapshot = await repository.listSnapshot({ status: "ALL" }, at("2026-10-09T00:03:00.000Z"));
    expect(snapshot.notifications.map((item) => item.template)).toEqual(["INCIDENT_REPEAT", "INCIDENT_OPENED"]);
    expect(snapshot.incidents[0].occurrenceCount).toBe(3);
    expect(first.opened).toBe(true);
  });

  it("uses compare-and-swap for acknowledge and resolve transitions", async () => {
    const recorded = await repository.recordEvent(createMonitoringEventWrite(event(), at("2026-10-09T00:00:00.000Z")));
    const audit = { auditId: "audit-1", incidentId: recorded.incident.incidentId, notificationId: null, jobId: null, operation: "ACKNOWLEDGE" as const, actorPrincipalId: "trusted-admin", occurredAt: at("2026-10-09T00:01:00.000Z"), outcome: "SUCCEEDED" as const, safeDetail: "确认。", correlationId: null };
    const acknowledged = await repository.acknowledgeIncident({ incidentId: recorded.incident.incidentId, expectedRevision: 1, actorPrincipalId: "trusted-admin", at: audit.occurredAt, audit });
    expect(acknowledged.status).toBe("ACKNOWLEDGED");
    await expect(repository.acknowledgeIncident({ incidentId: acknowledged.incidentId, expectedRevision: 1, actorPrincipalId: "trusted-admin", at: audit.occurredAt, audit })).rejects.toThrow();
    const resolved = await repository.resolveIncident({ incidentId: acknowledged.incidentId, expectedRevision: acknowledged.revision, actorPrincipalId: "trusted-admin", at: at("2026-10-09T00:02:00.000Z"), note: "已恢复", audit: { ...audit, operation: "RESOLVE", occurredAt: at("2026-10-09T00:02:00.000Z") } });
    expect(resolved.status).toBe("RESOLVED");
  });

  it("reopens resolved incidents with CAS, clears resolution metadata and protects active fingerprint uniqueness", async () => {
    const recorded = await repository.recordEvent(createMonitoringEventWrite(event(), at("2026-10-09T00:00:00.000Z")));
    const resolved = await repository.resolveIncident({
      incidentId: recorded.incident.incidentId, expectedRevision: recorded.incident.revision,
      actorPrincipalId: "trusted-admin", at: at("2026-10-09T00:01:00.000Z"), note: "处理完成",
      audit: { auditId: "resolve-1", incidentId: recorded.incident.incidentId, notificationId: null, jobId: null, operation: "RESOLVE", actorPrincipalId: "trusted-admin", occurredAt: at("2026-10-09T00:01:00.000Z"), outcome: "SUCCEEDED", safeDetail: "管理员已处理。", correlationId: null },
    });
    const reopened = await repository.reopenIncident({
      incidentId: resolved.incidentId, expectedRevision: resolved.revision, actorPrincipalId: "trusted-admin", at: at("2026-10-09T00:02:00.000Z"),
      audit: { auditId: "reopen-1", incidentId: resolved.incidentId, notificationId: null, jobId: null, operation: "REOPEN", actorPrincipalId: "trusted-admin", occurredAt: at("2026-10-09T00:02:00.000Z"), outcome: "SUCCEEDED", safeDetail: "管理员重新打开。", correlationId: null },
    });
    expect(reopened).toMatchObject({ status: "OPEN", acknowledgedAt: null, resolvedAt: null, resolvedBy: null, resolutionNote: null, revision: resolved.revision + 1 });
    expect(await repository.findActiveIncident(reopened.fingerprint)).toMatchObject({ incidentId: reopened.incidentId, status: "OPEN" });
    expect((await repository.listSnapshot({ status: "ALL" }, at("2026-10-09T00:02:01.000Z"))).audit).toContainEqual(expect.objectContaining({ operation: "REOPEN", actorPrincipalId: "trusted-admin" }));
    await expect(repository.reopenIncident({
      incidentId: reopened.incidentId, expectedRevision: resolved.revision, actorPrincipalId: "trusted-admin", at: at("2026-10-09T00:03:00.000Z"),
      audit: { auditId: "stale-reopen", incidentId: reopened.incidentId, notificationId: null, jobId: null, operation: "REOPEN", actorPrincipalId: "trusted-admin", occurredAt: at("2026-10-09T00:03:00.000Z"), outcome: "SUCCEEDED", safeDetail: "过期重试。", correlationId: null },
    })).rejects.toThrow();
    const closedAgain = await repository.resolveIncident({
      incidentId: reopened.incidentId, expectedRevision: reopened.revision, actorPrincipalId: "trusted-admin", at: at("2026-10-09T00:03:00.000Z"), note: "再次处理",
      audit: { auditId: "resolve-2", incidentId: reopened.incidentId, notificationId: null, jobId: null, operation: "RESOLVE", actorPrincipalId: "trusted-admin", occurredAt: at("2026-10-09T00:03:00.000Z"), outcome: "SUCCEEDED", safeDetail: "再次处理。", correlationId: null },
    });
    const newerIncident = await repository.recordEvent(createMonitoringEventWrite(event(), at("2026-10-09T00:04:00.000Z")));
    expect(newerIncident.incident.incidentId).not.toBe(closedAgain.incidentId);
    await expect(repository.reopenIncident({
      incidentId: closedAgain.incidentId, expectedRevision: closedAgain.revision, actorPrincipalId: "trusted-admin", at: at("2026-10-09T00:05:00.000Z"),
      audit: { auditId: "duplicate-reopen", incidentId: closedAgain.incidentId, notificationId: null, jobId: null, operation: "REOPEN", actorPrincipalId: "trusted-admin", occurredAt: at("2026-10-09T00:05:00.000Z"), outcome: "SUCCEEDED", safeDetail: "重复活动指纹。", correlationId: null },
    })).rejects.toThrow();
  });

  it("claims one sender, expires abandoned leases, and keeps acceptance distinct from delivery", async () => {
    await repository.recordEvent(createMonitoringEventWrite(event(), at("2026-10-09T00:00:00.000Z"), { recipients: ["ops@example.test"], repeatIntervalMs: 60_000 }));
    const claimed = await repository.claimDueNotifications({ now: at("2026-10-09T00:00:01.000Z"), leaseUntil: at("2026-10-09T00:01:00.000Z"), limit: 1 });
    expect(claimed).toHaveLength(1);
    expect(await repository.claimDueNotifications({ now: at("2026-10-09T00:00:30.000Z"), leaseUntil: at("2026-10-09T00:02:00.000Z"), limit: 1 })).toHaveLength(0);
    const provider = new RecordingNotificationProvider("ACCEPTED");
    const notification = claimed[0];
    await repository.recordNotificationResult({ notificationId: notification.notificationId, expectedStatus: "SENDING", result: { confirmation: "ACCEPTED", providerMessageId: "accepted" }, at: at("2026-10-09T00:00:10.000Z") });
    const snapshot = await repository.listSnapshot({ status: "ALL" }, at("2026-10-09T00:00:11.000Z"));
    expect(snapshot.notifications[0]).toMatchObject({ status: "SENT", providerAcceptedAt: at("2026-10-09T00:00:10.000Z"), deliveredAt: null });
    expect(notificationIdempotencyKey("incident", "ops@example.test", "OPENED")).toBe(notificationIdempotencyKey("incident", "OPS@example.test", "OPENED"));
    expect(provider.channel).toBe("EMAIL");
  });

  it("dispatches idempotently and retries a failed send only within the configured attempts", async () => {
    vi.stubEnv("EHS_MONITORING_ALERT_RECIPIENTS", "ops@example.test");
    const result = await recordOperationalEvent(event(), { repository, now: () => at("2026-10-09T00:00:00.000Z") });
    expect(result).not.toBeNull();
    const provider = new RecordingNotificationProvider("ACCEPTED");
    const outcomes = await dispatchNotificationOutbox(repository, provider, { now: () => at("2026-10-09T00:00:01.000Z") });
    expect(outcomes).toHaveLength(1);
    expect(provider.sent.size).toBe(1);
    const second = await dispatchNotificationOutbox(repository, provider, { now: () => at("2026-10-09T00:00:02.000Z") });
    expect(second).toHaveLength(0);
  });

  it("keeps failed notifications retryable with a bounded finite schedule", async () => {
    const result = await recordOperationalEvent(event(), { repository, now: () => at("2026-10-09T00:00:00.000Z") });
    expect(result).not.toBeNull();
    const failingProvider = { channel: "EMAIL" as const, send: async () => { throw new Error("provider internal detail"); } };
    const first = await dispatchNotificationOutbox(repository, failingProvider, { now: () => at("2026-10-09T00:00:01.000Z") });
    expect(first).toMatchObject([{ status: "FAILED", retryAt: "2026-10-09T00:01:01.000Z" }]);
    let snapshot = await repository.listSnapshot({ status: "ALL" }, at("2026-10-09T00:00:02.000Z"));
    expect(snapshot.notifications[0]).toMatchObject({ status: "FAILED", attemptCount: 1, failureReason: "PROVIDER_SEND_FAILED" });
    expect(JSON.stringify(snapshot)).not.toContain("provider internal detail");

    const noLongerDue = await dispatchNotificationOutbox(repository, failingProvider, { now: () => at("2026-10-09T00:00:30.000Z") });
    expect(noLongerDue).toHaveLength(0);
    const second = await dispatchNotificationOutbox(repository, failingProvider, { now: () => at("2026-10-09T00:01:02.000Z") });
    expect(second[0].status).toBe("FAILED");
    snapshot = await repository.listSnapshot({ status: "ALL" }, at("2026-10-09T00:01:03.000Z"));
    expect(snapshot.notifications[0].attemptCount).toBe(2);
    expect(retryAtForAttempt(DEFAULT_NOTIFICATION_POLICY.maxAttempts, Date.parse("2026-10-09T00:00:00.000Z"), DEFAULT_NOTIFICATION_POLICY)).toBeNull();
  });

  it("resolves only after a positive recovery signal", async () => {
    const recorded = await repository.recordEvent(createMonitoringEventWrite(event(), at("2026-10-09T00:00:00.000Z")));
    expect((await repository.findActiveIncident(recorded.incident.fingerprint))?.status).toBe("OPEN");
    const recovered = await repository.resolveAfterVerifiedRecovery({ fingerprint: recorded.incident.fingerprint, at: at("2026-10-09T00:05:00.000Z"), signal: "health probe succeeded", audit: { auditId: "recovery", incidentId: recorded.incident.incidentId, notificationId: null, jobId: null, operation: "RESOLVE", actorPrincipalId: "system", occurredAt: at("2026-10-09T00:05:00.000Z"), outcome: "SUCCEEDED", safeDetail: "positive probe", correlationId: null }, notification: null });
    expect(recovered?.status).toBe("RESOLVED");
  });
});

describe("Job watchdog", () => {
  const policy = { jobId: "pull-certs", jobName: "证件同步", firstExpectedAt: at("2026-10-09T00:00:00.000Z"), expectedIntervalMs: 60_000, allowedDelayMs: 10_000, maxRuntimeMs: 120_000, maxHeartbeatAgeMs: 30_000 };
  it("does not alert before a configured first run is due", () => {
    expect(evaluateJobWatchdog(policy, null, at("2026-10-09T00:00:05.000Z"))).toBeNull();
  });
  it("detects a task that never started after its configured grace period", () => {
    expect(evaluateJobWatchdog(policy, null, at("2026-10-09T00:00:11.000Z"))?.errorCode).toBe("JOB_NEVER_STARTED");
  });
  it("detects execution timeout and lost heartbeat independently", () => {
    const running = { jobId: policy.jobId, jobName: policy.jobName, expectedSchedule: "configured", startedAt: at("2026-10-09T00:00:00.000Z"), completedAt: null, lastHeartbeatAt: at("2026-10-09T00:02:00.000Z"), executionStatus: "RUNNING" as const, executionId: "exec-1", failureReason: null, lastSuccessAt: null };
    expect(evaluateJobWatchdog(policy, running, at("2026-10-09T00:02:01.000Z"))?.errorCode).toBe("JOB_EXECUTION_TIMEOUT");
    expect(evaluateJobWatchdog({ ...policy, maxRuntimeMs: 300_000 }, { ...running, lastHeartbeatAt: at("2026-10-09T00:00:00.000Z") }, at("2026-10-09T00:00:31.000Z"))?.errorCode).toBe("JOB_HEARTBEAT_LOST");
  });
  it("ignores empty plans and invalid thresholds instead of inventing schedules", () => {
    expect(evaluateJobWatchdog({ ...policy, expectedIntervalMs: 0 }, null, at("2026-10-10T00:00:00.000Z"))).toBeNull();
  });
});
