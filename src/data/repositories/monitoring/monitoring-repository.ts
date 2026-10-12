import type {
  JobExecutionUpdate,
  JobMonitoringState,
  MonitoringAuditEvent,
  MonitoringQuery,
  MonitoringSnapshot,
  NotificationOutboxItem,
  NotificationProviderResult,
  OperationalEvent,
  OperationalEventInput,
  OperationalIncident,
} from "@/data/contracts/monitoring";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

export interface MonitoringEventWrite {
  input: OperationalEventInput;
  eventId: string;
  occurredAt: TimezoneAwareIsoDateTime;
  fingerprint: string;
  incidentId: string;
  notification: { recipients: readonly string[]; repeatIntervalMs: number } | null;
}

export interface RecoveryNotificationRequest {
  recipients: readonly string[];
}

/**
 * Production implementations must persist event + incident aggregation atomically, enforce
 * fingerprints/idempotency with unique constraints, and use transactional/conditional updates for
 * every state transition. This port is separate from EHS business repositories and their commits.
 */
export interface MonitoringRepository {
  recordEvent(write: MonitoringEventWrite): Promise<{ event: OperationalEvent; incident: OperationalIncident; opened: boolean }>;
  listSnapshot(query: MonitoringQuery, sampledAt: TimezoneAwareIsoDateTime): Promise<MonitoringSnapshot>;
  acknowledgeIncident(input: { incidentId: string; expectedRevision: number; actorPrincipalId: string; at: TimezoneAwareIsoDateTime; audit: MonitoringAuditEvent }): Promise<OperationalIncident>;
  resolveIncident(input: { incidentId: string; expectedRevision: number; actorPrincipalId: string; at: TimezoneAwareIsoDateTime; note: string; audit: MonitoringAuditEvent }): Promise<OperationalIncident>;
  /** Atomically reopen a resolved incident, enforcing one active incident per fingerprint and writing the audit event. */
  reopenIncident(input: { incidentId: string; expectedRevision: number; actorPrincipalId: string; at: TimezoneAwareIsoDateTime; audit: MonitoringAuditEvent }): Promise<OperationalIncident>;
  resolveAfterVerifiedRecovery(input: { fingerprint: string; at: TimezoneAwareIsoDateTime; signal: string; audit: MonitoringAuditEvent; notification: RecoveryNotificationRequest | null }): Promise<OperationalIncident | null>;
  enqueueNotification(input: Omit<NotificationOutboxItem, "notificationId" | "status" | "attemptCount" | "lastAttemptAt" | "providerAcceptedAt" | "deliveredAt" | "failureReason" | "leaseUntil">): Promise<{ item: NotificationOutboxItem; inserted: boolean }>;
  claimDueNotifications(input: { now: TimezoneAwareIsoDateTime; leaseUntil: TimezoneAwareIsoDateTime; limit: number }): Promise<readonly NotificationOutboxItem[]>;
  recordNotificationResult(input: { notificationId: string; expectedStatus: "SENDING"; result: NotificationProviderResult; at: TimezoneAwareIsoDateTime }): Promise<NotificationOutboxItem>;
  recordNotificationFailure(input: { notificationId: string; expectedStatus: "SENDING"; failureReason: string; retryAt: TimezoneAwareIsoDateTime | null; at: TimezoneAwareIsoDateTime }): Promise<NotificationOutboxItem>;
  retryNotification(input: { notificationId: string; at: TimezoneAwareIsoDateTime; audit: MonitoringAuditEvent }): Promise<NotificationOutboxItem>;
  appendAudit(event: MonitoringAuditEvent): Promise<void>;
  /** Atomic per-principal sliding-window limit; production adapters must enforce it across workers. */
  consumeClientErrorReport(input: { principalId: string; now: TimezoneAwareIsoDateTime; limitPerMinute: number }): Promise<boolean>;
  upsertJob(update: JobExecutionUpdate): Promise<JobMonitoringState>;
  listJobs(): Promise<readonly JobMonitoringState[]>;
  getIncident(incidentId: string): Promise<OperationalIncident | null>;
  findActiveIncident(fingerprint: string): Promise<OperationalIncident | null>;
}

export class MonitoringStateConflictError extends Error {}
export class MonitoringItemNotFoundError extends Error {}
export class MonitoringStorageUnavailableError extends Error {}
