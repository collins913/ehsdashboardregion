import type {
  JobExecutionUpdate,
  JobMonitoringState,
  MonitoringAuditEvent,
  MonitoringQuery,
  MonitoringSnapshot,
  NotificationOutboxItem,
  NotificationProviderResult,
  OperationalEvent,
  OperationalIncident,
} from "@/data/contracts/monitoring";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import { createHash } from "node:crypto";
import {
  MonitoringItemNotFoundError,
  MonitoringStateConflictError,
  type MonitoringEventWrite,
  type MonitoringRepository,
} from "@/data/repositories/monitoring/monitoring-repository";

export class MemoryMonitoringRepository implements MonitoringRepository {
  private readonly events = new Map<string, OperationalEvent>();
  private readonly incidents = new Map<string, OperationalIncident>();
  private readonly activeByFingerprint = new Map<string, string>();
  private readonly notifications = new Map<string, NotificationOutboxItem>();
  private readonly notificationsByIdempotency = new Map<string, string>();
  private readonly jobs = new Map<string, JobMonitoringState>();
  private readonly audit: MonitoringAuditEvent[] = [];
  private readonly clientReports = new Map<string, number[]>();

  async recordEvent(write: MonitoringEventWrite) {
    const activeId = this.activeByFingerprint.get(write.fingerprint);
    const previous = activeId ? this.incidents.get(activeId) : undefined;
    const opened = !previous;
    const incidentId = previous?.incidentId ?? write.incidentId;
    const event: OperationalEvent = { ...write.input, eventId: write.eventId, occurredAt: write.occurredAt, fingerprint: write.fingerprint, incidentId };
    const incident: OperationalIncident = previous ? {
      ...previous,
      severity: severityRank[write.input.severity] > severityRank[previous.severity] ? write.input.severity : previous.severity,
      lastOccurredAt: write.occurredAt,
      occurrenceCount: previous.occurrenceCount + 1,
      causeStatus: previous.causeStatus === "KNOWN" || write.input.causeStatus === "UNKNOWN" ? previous.causeStatus : write.input.causeStatus,
      knownCause: previous.knownCause ?? write.input.knownCause,
      impact: { ...write.input.impact, summary: write.input.impact.summary || previous.impact.summary },
      relatedEvents: addUnique(previous.relatedEvents, event.eventId),
      relatedRequestIds: addOptional(previous.relatedRequestIds, write.input.correlationId),
      relatedBatchIds: addOptional(previous.relatedBatchIds, write.input.relatedBatchId),
      relatedJobIds: addOptional(previous.relatedJobIds, write.input.relatedJobId),
      revision: previous.revision + 1,
    } : {
      incidentId, fingerprint: write.fingerprint, severity: write.input.severity, status: "OPEN",
      firstOccurredAt: write.occurredAt, lastOccurredAt: write.occurredAt, occurrenceCount: 1,
      source: write.input.source, component: write.input.component, errorCode: write.input.errorCode,
      summary: write.input.safeMessage, causeStatus: write.input.causeStatus, knownCause: write.input.knownCause,
      impact: write.input.impact, relatedEvents: [event.eventId],
      relatedRequestIds: write.input.correlationId ? [write.input.correlationId] : [],
      relatedBatchIds: write.input.relatedBatchId ? [write.input.relatedBatchId] : [],
      relatedJobIds: write.input.relatedJobId ? [write.input.relatedJobId] : [],
      acknowledgedAt: null, acknowledgedBy: null, resolvedAt: null, resolvedBy: null,
      resolutionNote: null, recoverySignal: null, lastNotifiedAt: null, revision: 1,
    };
    const notificationPlan = write.notification;
    const shouldEnqueue = Boolean(notificationPlan?.recipients.length && (opened || !incident.lastNotifiedAt || Date.parse(write.occurredAt) - Date.parse(incident.lastNotifiedAt) >= notificationPlan.repeatIntervalMs));
    const notificationTemplate = opened || !incident.lastNotifiedAt ? "INCIDENT_OPENED" : "INCIDENT_REPEAT";
    if (shouldEnqueue && notificationPlan) {
      const bucket = Math.floor(Date.parse(write.occurredAt) / notificationPlan.repeatIntervalMs);
      for (const recipient of notificationPlan.recipients) this.insertNotification({
        incidentId, channel: "EMAIL", recipient, template: notificationTemplate,
        nextRetryAt: write.occurredAt, idempotencyKey: notificationKey(incidentId, notificationTemplate, notificationTemplate === "INCIDENT_OPENED" ? "open" : String(bucket), recipient),
        createdAt: write.occurredAt,
      });
      incident.lastNotifiedAt = write.occurredAt;
    }
    this.events.set(event.eventId, event);
    this.incidents.set(incident.incidentId, incident);
    this.activeByFingerprint.set(write.fingerprint, incident.incidentId);
    return { event, incident, opened };
  }

  async listSnapshot(query: MonitoringQuery, sampledAt: TimezoneAwareIsoDateTime): Promise<MonitoringSnapshot> {
    const limit = Math.max(1, Math.min(200, query.limit ?? 100));
    const events = [...this.events.values()].filter((event) =>
      (!query.since || event.occurredAt >= query.since) && (!query.until || event.occurredAt <= query.until) &&
      (!query.severity || query.severity === "ALL" || event.severity === query.severity) &&
      (!query.source || query.source === "ALL" || event.source === query.source),
    ).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
    const eventIds = new Set(events.map((event) => event.eventId));
    const eventIncidentIds = new Set(events.map((event) => event.incidentId));
    const incidents = [...this.incidents.values()].filter((incident) =>
      (query.status === undefined || query.status === "ALL" || incident.status === query.status) &&
      (query.severity === undefined || query.severity === "ALL" || incident.severity === query.severity) &&
      (query.source === undefined || query.source === "ALL" || incident.source === query.source) &&
      ((incident.relatedEvents.some((id) => eventIds.has(id))) || (!query.since && !query.until && eventIncidentIds.has(incident.incidentId))),
    ).sort((a, b) => b.lastOccurredAt.localeCompare(a.lastOccurredAt)).slice(0, limit);
    const incidentIds = new Set(incidents.map((incident) => incident.incidentId));
    const notifications = [...this.notifications.values()].filter((item) => incidentIds.has(item.incidentId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    const audit = this.audit.filter((item) => !item.incidentId || incidentIds.has(item.incidentId)).slice(-limit).reverse();
    return { incidents, events, notifications, jobs: await this.listJobs(), audit, sampledAt };
  }

  async acknowledgeIncident(input: { incidentId: string; expectedRevision: number; actorPrincipalId: string; at: TimezoneAwareIsoDateTime; audit: MonitoringAuditEvent }) {
    const incident = this.incidents.get(input.incidentId);
    if (!incident) throw new MonitoringItemNotFoundError();
    if (incident.revision !== input.expectedRevision || incident.status !== "OPEN") throw new MonitoringStateConflictError();
    const updated: OperationalIncident = { ...incident, status: "ACKNOWLEDGED", acknowledgedAt: input.at, acknowledgedBy: input.actorPrincipalId, revision: incident.revision + 1 };
    this.incidents.set(updated.incidentId, updated);
    this.audit.push(input.audit);
    return updated;
  }

  async resolveIncident(input: { incidentId: string; expectedRevision: number; actorPrincipalId: string; at: TimezoneAwareIsoDateTime; note: string; audit: MonitoringAuditEvent }) {
    const incident = this.incidents.get(input.incidentId);
    if (!incident) throw new MonitoringItemNotFoundError();
    if (incident.revision !== input.expectedRevision || incident.status === "RESOLVED") throw new MonitoringStateConflictError();
    const updated: OperationalIncident = { ...incident, status: "RESOLVED", resolvedAt: input.at, resolvedBy: input.actorPrincipalId, resolutionNote: input.note, recoverySignal: null, revision: incident.revision + 1 };
    this.incidents.set(updated.incidentId, updated);
    this.activeByFingerprint.delete(incident.fingerprint);
    this.audit.push(input.audit);
    return updated;
  }

  async reopenIncident(input: { incidentId: string; expectedRevision: number; actorPrincipalId: string; at: TimezoneAwareIsoDateTime; audit: MonitoringAuditEvent }) {
    const incident = this.incidents.get(input.incidentId);
    if (!incident) throw new MonitoringItemNotFoundError();
    const activeIncidentId = this.activeByFingerprint.get(incident.fingerprint);
    if (incident.revision !== input.expectedRevision || incident.status !== "RESOLVED" || (activeIncidentId && activeIncidentId !== incident.incidentId)) throw new MonitoringStateConflictError();
    const updated: OperationalIncident = {
      ...incident, status: "OPEN", acknowledgedAt: null, acknowledgedBy: null,
      resolvedAt: null, resolvedBy: null, resolutionNote: null, recoverySignal: null,
      revision: incident.revision + 1,
    };
    this.incidents.set(updated.incidentId, updated);
    this.activeByFingerprint.set(updated.fingerprint, updated.incidentId);
    this.audit.push(input.audit);
    return updated;
  }

  async resolveAfterVerifiedRecovery(input: { fingerprint: string; at: TimezoneAwareIsoDateTime; signal: string; audit: MonitoringAuditEvent; notification: { recipients: readonly string[] } | null }) {
    const id = this.activeByFingerprint.get(input.fingerprint);
    const incident = id ? this.incidents.get(id) : null;
    if (!incident) return null;
    const updated: OperationalIncident = { ...incident, status: "RESOLVED", resolvedAt: input.at, resolvedBy: "system:verified-recovery", resolutionNote: "系统收到明确的恢复信号。", recoverySignal: input.signal, revision: incident.revision + 1 };
    for (const recipient of input.notification?.recipients ?? []) this.insertNotification({
      incidentId: incident.incidentId, channel: "EMAIL", recipient, template: "INCIDENT_RECOVERED",
      nextRetryAt: input.at, idempotencyKey: notificationKey(incident.incidentId, "INCIDENT_RECOVERED", "recovered", recipient), createdAt: input.at,
    });
    this.incidents.set(updated.incidentId, updated);
    this.activeByFingerprint.delete(input.fingerprint);
    this.audit.push(input.audit);
    return updated;
  }

  async enqueueNotification(input: Omit<NotificationOutboxItem, "notificationId" | "status" | "attemptCount" | "lastAttemptAt" | "providerAcceptedAt" | "deliveredAt" | "failureReason" | "leaseUntil">) {
    return this.insertNotification(input);
  }

  private insertNotification(input: Omit<NotificationOutboxItem, "notificationId" | "status" | "attemptCount" | "lastAttemptAt" | "providerAcceptedAt" | "deliveredAt" | "failureReason" | "leaseUntil">) {
    const existingId = this.notificationsByIdempotency.get(input.idempotencyKey);
    if (existingId) return { item: this.notifications.get(existingId)!, inserted: false };
    const notificationId = crypto.randomUUID();
    const item: NotificationOutboxItem = { ...input, notificationId, status: "PENDING", attemptCount: 0, lastAttemptAt: null, providerAcceptedAt: null, deliveredAt: null, failureReason: null, leaseUntil: null };
    this.notifications.set(notificationId, item);
    this.notificationsByIdempotency.set(item.idempotencyKey, notificationId);
    return { item, inserted: true };
  }

  async claimDueNotifications(input: { now: TimezoneAwareIsoDateTime; leaseUntil: TimezoneAwareIsoDateTime; limit: number }) {
    const due = [...this.notifications.values()].filter((item) =>
      (item.status === "PENDING" || (item.status === "FAILED" && item.nextRetryAt !== null && item.nextRetryAt <= input.now) || (item.status === "SENDING" && item.leaseUntil !== null && item.leaseUntil <= input.now)) &&
      (item.nextRetryAt === null || item.nextRetryAt <= input.now),
    ).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, input.limit);
    return due.map((item) => {
      const claimed: NotificationOutboxItem = { ...item, status: "SENDING", attemptCount: item.attemptCount + 1, lastAttemptAt: input.now, leaseUntil: input.leaseUntil, nextRetryAt: null };
      this.notifications.set(claimed.notificationId, claimed);
      return claimed;
    });
  }

  async recordNotificationResult(input: { notificationId: string; expectedStatus: "SENDING"; result: NotificationProviderResult; at: TimezoneAwareIsoDateTime }) {
    const item = this.notifications.get(input.notificationId);
    if (!item) throw new MonitoringItemNotFoundError();
    if (item.status !== input.expectedStatus) throw new MonitoringStateConflictError();
    const updated: NotificationOutboxItem = { ...item, status: "SENT", providerAcceptedAt: input.at, deliveredAt: input.result.confirmation === "DELIVERED" ? input.at : null, leaseUntil: null, failureReason: null };
    this.notifications.set(updated.notificationId, updated);
    return updated;
  }

  async recordNotificationFailure(input: { notificationId: string; expectedStatus: "SENDING"; failureReason: string; retryAt: TimezoneAwareIsoDateTime | null; at: TimezoneAwareIsoDateTime }) {
    const item = this.notifications.get(input.notificationId);
    if (!item) throw new MonitoringItemNotFoundError();
    if (item.status !== input.expectedStatus) throw new MonitoringStateConflictError();
    const updated: NotificationOutboxItem = { ...item, status: "FAILED", failureReason: input.failureReason, nextRetryAt: input.retryAt, leaseUntil: null, lastAttemptAt: input.at };
    this.notifications.set(updated.notificationId, updated);
    return updated;
  }

  async retryNotification(input: { notificationId: string; at: TimezoneAwareIsoDateTime; audit: MonitoringAuditEvent }) {
    const item = this.notifications.get(input.notificationId);
    if (!item) throw new MonitoringItemNotFoundError();
    if (item.status !== "FAILED") throw new MonitoringStateConflictError();
    const updated: NotificationOutboxItem = { ...item, status: "PENDING", nextRetryAt: input.at, failureReason: null, leaseUntil: null };
    this.notifications.set(updated.notificationId, updated);
    this.audit.push(input.audit);
    return updated;
  }

  async appendAudit(event: MonitoringAuditEvent) { this.audit.push(event); }

  async consumeClientErrorReport(input: { principalId: string; now: TimezoneAwareIsoDateTime; limitPerMinute: number }) {
    const now = Date.parse(input.now);
    const recent = (this.clientReports.get(input.principalId) ?? []).filter((time) => now - time < 60_000);
    if (recent.length >= input.limitPerMinute) { this.clientReports.set(input.principalId, recent); return false; }
    this.clientReports.set(input.principalId, [...recent, now]);
    return true;
  }

  async upsertJob(update: JobExecutionUpdate): Promise<JobMonitoringState> {
    const previous = this.jobs.get(update.jobId);
    const state: JobMonitoringState = {
      jobId: update.jobId, jobName: update.jobName, expectedSchedule: update.expectedSchedule,
      startedAt: update.startedAt,
      completedAt: update.completedAt,
      lastHeartbeatAt: update.lastHeartbeatAt, executionStatus: update.executionStatus,
      executionId: update.executionId, failureReason: update.failureReason,
      lastSuccessAt: update.executionStatus === "SUCCEEDED" ? update.completedAt : previous?.lastSuccessAt ?? null,
    };
    this.jobs.set(state.jobId, state);
    return state;
  }

  async listJobs() { return [...this.jobs.values()].sort((a, b) => a.jobName.localeCompare(b.jobName)); }

  async getIncident(incidentId: string) { return this.incidents.get(incidentId) ?? null; }

  async findActiveIncident(fingerprint: string) {
    const id = this.activeByFingerprint.get(fingerprint);
    return id ? this.incidents.get(id) ?? null : null;
  }
}

const severityRank = { INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3 } as const;
function addUnique(values: readonly string[], value: string): readonly string[] { return values.includes(value) ? values : [...values, value]; }
function addOptional(values: readonly string[], value: string | null): readonly string[] { return value ? addUnique(values, value) : values; }
function notificationKey(incidentId: string, template: string, bucket: string, recipient: string) {
  const recipientHash = createHash("sha256").update(recipient.trim().toLowerCase()).digest("hex").slice(0, 16);
  return `incident:${incidentId}:${template}:${bucket}:${recipientHash}`;
}
