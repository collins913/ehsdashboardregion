import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type {
  MonitoringAuditEvent,
  MonitoringQuery,
  NotificationMessage,
  NotificationProvider,
  OperationalEventInput,
  OperationalIncident,
} from "@/data/contracts/monitoring";
import type { ProductionDomain } from "@/data/contracts/production-import";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import type { MonitoringRepository } from "@/data/repositories/monitoring/monitoring-repository";
import { redactOperationalText, createMonitoringEventWrite, operationalFingerprint } from "./operational-event";
import { DEFAULT_NOTIFICATION_POLICY, retryAtForAttempt, shouldNotifyIncident, shouldNotifySeverity } from "./notification-policy";
import { getMonitoringRepository } from "./monitoring-runtime.server";

const isoNow = (): TimezoneAwareIsoDateTime => new Date().toISOString() as TimezoneAwareIsoDateTime;

function degradedSignal(input: OperationalEventInput, reason: string) {
  // This is a best-effort out-of-process diagnostic only. It is not durable monitoring storage.
  console.error(JSON.stringify({
    type: "monitoring_storage_degraded",
    at: isoNow(),
    severity: input.severity,
    source: redactOperationalText(input.source, 80),
    component: redactOperationalText(input.component, 120),
    errorCode: /^[A-Z0-9_:.\-/]{1,100}$/.test(input.errorCode) ? input.errorCode : "UNCLASSIFIED_FAILURE",
    correlationId: input.correlationId ? redactOperationalText(input.correlationId, 200) : null,
    reason: /^[A-Z0-9_]{2,100}$/.test(reason) ? reason : "MONITORING_STORAGE_FAILURE",
  }));
}

function configuredRecipients(env: NodeJS.ProcessEnv): string[] {
  return (env.EHS_MONITORING_ALERT_RECIPIENTS ?? "").split(",").map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)).slice(0, 20);
}

function notificationMessage(incident: OperationalIncident, template: "INCIDENT_OPENED" | "INCIDENT_REPEAT" | "INCIDENT_RECOVERED", env: NodeJS.ProcessEnv): NotificationMessage {
  const baseUrl = (env.EHS_APP_URL ?? "").replace(/\/$/, "");
  const cause = incident.causeStatus === "KNOWN" && incident.knownCause ? incident.knownCause : "根因待确认。";
  return {
    systemName: "EHS 管理看板",
    severity: incident.severity,
    title: template === "INCIDENT_RECOVERED" ? `故障已恢复：${incident.summary}` : incident.summary,
    occurredAt: incident.firstOccurredAt,
    component: incident.component,
    errorCode: incident.errorCode,
    cause,
    impact: incident.impact.summary,
    actionTaken: "已记录并关联运行事件。",
    nextStep: template === "INCIDENT_RECOVERED" ? "系统收到明确恢复信号，请管理员确认后续观察。" : "请管理员在系统监控页面查看诊断并跟进。",
    incidentId: incident.incidentId,
    detailUrl: `${baseUrl}/monitoring?incidentId=${encodeURIComponent(incident.incidentId)}`,
    occurrenceCount: incident.occurrenceCount,
  };
}

export async function recordOperationalEvent(
  input: OperationalEventInput,
  options: { repository?: MonitoringRepository; now?: () => TimezoneAwareIsoDateTime; throwOnStorageFailure?: boolean } = {},
) {
  const now = options.now ?? isoNow;
  let repository: MonitoringRepository;
  try { repository = options.repository ?? getMonitoringRepository(); }
  catch (error) {
    degradedSignal(input, error instanceof Error ? error.message : "MONITORING_RUNTIME_UNAVAILABLE");
    if (options.throwOnStorageFailure) throw error;
    return null;
  }
  const recipients = configuredRecipients(process.env);
  const notifyWarnings = process.env.EHS_MONITORING_NOTIFY_WARNINGS === "true";
  const shouldQueue = shouldNotifySeverity(input.severity, input.source, { ...DEFAULT_NOTIFICATION_POLICY, notifyWarnings });
  if (shouldQueue && recipients.length === 0) {
    console.warn(JSON.stringify({ type: "monitoring_notification_route_missing", errorCode: "NOTIFICATION_RECIPIENTS_NOT_CONFIGURED" }));
  }
  const notification = shouldQueue && recipients.length > 0
    ? { recipients, repeatIntervalMs: DEFAULT_NOTIFICATION_POLICY.repeatSummaryIntervalMs }
    : null;
  const write = createMonitoringEventWrite(input, now(), notification);
  let result: Awaited<ReturnType<MonitoringRepository["recordEvent"]>>;
  try {
    result = await repository.recordEvent(write);
  } catch (error) {
    degradedSignal(input, error instanceof Error ? error.message : "MONITORING_WRITE_FAILED");
    if (options.throwOnStorageFailure) throw error;
    return null;
  }
  return result;
}

/** Stable recipient-scoped key helper used by configured adapters and tests. */
export function notificationIdempotencyKey(incidentId: string, recipient: string, template: string, bucket = "open") {
  const recipientHash = createHash("sha256").update(recipient.trim().toLowerCase()).digest("hex").slice(0, 16);
  return `incident:${incidentId}:${template}:${bucket}:${recipientHash}`;
}

export async function dispatchNotificationOutbox(
  repository: MonitoringRepository,
  provider: NotificationProvider,
  input: { now?: () => TimezoneAwareIsoDateTime; limit?: number; leaseMs?: number } = {},
) {
  const now = input.now ?? isoNow;
  const claimed = await repository.claimDueNotifications({
    now: now(), leaseUntil: new Date(Date.parse(now()) + (input.leaseMs ?? 60_000)).toISOString() as TimezoneAwareIsoDateTime,
    limit: Math.max(1, Math.min(input.limit ?? 20, 100)),
  });
  const outcomes = [];
  for (const item of claimed) {
    const incident = await repository.getIncident(item.incidentId);
    if (!incident) {
      outcomes.push({ notificationId: item.notificationId, status: "SKIPPED" as const });
      continue;
    }
    try {
      const result = await provider.send({ recipient: item.recipient, message: notificationMessage(incident, item.template, process.env), idempotencyKey: item.idempotencyKey });
      await repository.recordNotificationResult({ notificationId: item.notificationId, expectedStatus: "SENDING", result, at: now() });
      outcomes.push({ notificationId: item.notificationId, status: "SENT" as const, confirmation: result.confirmation });
    } catch {
      const retryAt = retryAtForAttempt(item.attemptCount, Date.parse(now()), DEFAULT_NOTIFICATION_POLICY) as TimezoneAwareIsoDateTime | null;
      await repository.recordNotificationFailure({ notificationId: item.notificationId, expectedStatus: "SENDING", failureReason: "PROVIDER_SEND_FAILED", retryAt, at: now() });
      await recordOperationalEvent({
        environment: process.env.NODE_ENV ?? "unknown", source: "Notification", component: "Email Provider",
        severity: "ERROR", errorCode: "NOTIFICATION_DELIVERY_FAILED", safeMessage: "通知发送失败。",
        phenomenon: "通知提供方未确认发送请求。", causeStatus: "UNKNOWN", knownCause: null,
        impact: { kind: "NOTIFICATION", id: item.notificationId, summary: "一条管理员通知尚未发送。" },
        actionTaken: retryAt ? "已安排有限次数的延迟重试。" : "已停止自动重试，保留失败记录。",
        nextStep: "检查企业邮件适配器及投递状态。", correlationId: item.idempotencyKey,
        relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [],
      }, { repository, now });
      outcomes.push({ notificationId: item.notificationId, status: "FAILED" as const, retryAt });
    }
  }
  return outcomes;
}

export async function acknowledgeOperationalIncident(repository: MonitoringRepository, input: { incidentId: string; expectedRevision: number; principalId: string; correlationId?: string | null; now?: () => TimezoneAwareIsoDateTime }) {
  const now = input.now ?? isoNow;
  const audit = createAudit({ incidentId: input.incidentId, operation: "ACKNOWLEDGE", actorPrincipalId: input.principalId, at: now(), correlationId: input.correlationId ?? null, safeDetail: "管理员确认 Incident。", outcome: "SUCCEEDED" });
  return repository.acknowledgeIncident({ incidentId: input.incidentId, expectedRevision: input.expectedRevision, actorPrincipalId: input.principalId, at: now(), audit });
}

export async function resolveOperationalIncident(repository: MonitoringRepository, input: { incidentId: string; expectedRevision: number; principalId: string; note: string; correlationId?: string | null; now?: () => TimezoneAwareIsoDateTime }) {
  const now = input.now ?? isoNow;
  const note = redactOperationalText(input.note);
  if (!note) throw new Error("RESOLUTION_NOTE_REQUIRED");
  const audit = createAudit({ incidentId: input.incidentId, operation: "RESOLVE", actorPrincipalId: input.principalId, at: now(), correlationId: input.correlationId ?? null, safeDetail: "管理员标记 Incident 已解决。", outcome: "SUCCEEDED" });
  return repository.resolveIncident({ incidentId: input.incidentId, expectedRevision: input.expectedRevision, actorPrincipalId: input.principalId, at: now(), note, audit });
}

export async function reopenOperationalIncident(repository: MonitoringRepository, input: { incidentId: string; expectedRevision: number; principalId: string; correlationId?: string | null; now?: () => TimezoneAwareIsoDateTime }) {
  const now = input.now ?? isoNow;
  const audit = createAudit({ incidentId: input.incidentId, operation: "REOPEN", actorPrincipalId: input.principalId, at: now(), correlationId: input.correlationId ?? null, safeDetail: "管理员将 Incident 重新标记为未处理。", outcome: "SUCCEEDED" });
  return repository.reopenIncident({ incidentId: input.incidentId, expectedRevision: input.expectedRevision, actorPrincipalId: input.principalId, at: now(), audit });
}

export async function recordVerifiedRecovery(repository: MonitoringRepository, input: { source: string; component: string; errorCode: string; impact: OperationalEventInput["impact"]; signal: string; now?: () => TimezoneAwareIsoDateTime }) {
  const now = input.now ?? isoNow;
  const fingerprint = operationalFingerprint({ source: input.source, component: input.component, errorCode: input.errorCode, impact: input.impact });
  const signal = redactOperationalText(input.signal, 250);
  if (!signal) throw new Error("VERIFIED_RECOVERY_SIGNAL_REQUIRED");
  const active = await repository.findActiveIncident(fingerprint);
  const notify = Boolean(active && shouldNotifyIncident(active, { ...DEFAULT_NOTIFICATION_POLICY, notifyWarnings: process.env.EHS_MONITORING_NOTIFY_WARNINGS === "true" }));
  const recipients = notify ? configuredRecipients(process.env) : [];
  return repository.resolveAfterVerifiedRecovery({
    fingerprint, at: now(), signal,
    audit: createAudit({ incidentId: active?.incidentId ?? null, operation: "RESOLVE", actorPrincipalId: "system:verified-recovery", at: now(), correlationId: null, safeDetail: "收到经过验证的恢复信号。", outcome: "SUCCEEDED" }),
    notification: recipients.length ? { recipients } : null,
  });
}

export async function retryOperationalNotification(repository: MonitoringRepository, input: { notificationId: string; principalId: string; now?: () => TimezoneAwareIsoDateTime }) {
  const now = input.now ?? isoNow;
  const audit = createAudit({ notificationId: input.notificationId, operation: "RETRY_NOTIFICATION", actorPrincipalId: input.principalId, at: now(), correlationId: null, safeDetail: "管理员手动重新排入通知发送队列。", outcome: "SUCCEEDED" });
  return repository.retryNotification({ notificationId: input.notificationId, at: now(), audit });
}

export function monitoringQueryForAdmin(query: MonitoringQuery) { return query; }

function createAudit(input: Pick<MonitoringAuditEvent, "operation" | "actorPrincipalId" | "outcome" | "safeDetail" | "correlationId"> & Partial<Pick<MonitoringAuditEvent, "incidentId" | "notificationId" | "jobId">> & { at: TimezoneAwareIsoDateTime }): MonitoringAuditEvent {
  const { at, ...rest } = input;
  return { incidentId: null, notificationId: null, jobId: null, ...rest, occurredAt: at, auditId: randomUUID() };
}

export function importDiagnosticsToOperationalDiagnostics(diagnostics: readonly { code: string; field: string | null; recordId: string | null; severity: "ERROR" | "WARNING"; message: string }[]) {
  return diagnostics.slice(0, 20).map((item) => ({ code: item.code, ...(item.field ? { field: item.field } : {}), ...(item.recordId ? { recordId: item.recordId } : {}), severity: item.severity, message: item.message }));
}
