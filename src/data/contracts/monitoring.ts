import type { ProductionDomain, ImportDiagnostic } from "@/data/contracts/production-import";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

export type OperationalSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type CauseStatus = "KNOWN" | "UNKNOWN";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type MonitoringImpactKind = "SYSTEM" | "DOMAIN" | "SOURCE" | "STORE" | "BATCH" | "JOB" | "NOTIFICATION";
export type NotificationChannel = "EMAIL";
export type NotificationStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";
export type NotificationDeliveryConfirmation = "ACCEPTED" | "DELIVERED";
export type JobExecutionStatus = "NOT_STARTED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface MonitoringImpact {
  kind: MonitoringImpactKind;
  id: string | null;
  summary: string;
}

export interface OperationalDiagnostic {
  code: string;
  field?: string;
  recordId?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
}

export interface OperationalEventInput {
  environment: string;
  source: string;
  component: string;
  severity: OperationalSeverity;
  errorCode: string;
  safeMessage: string;
  phenomenon: string;
  causeStatus: CauseStatus;
  knownCause: string | null;
  impact: MonitoringImpact;
  actionTaken: string;
  nextStep: string;
  correlationId: string | null;
  relatedBatchId: string | null;
  relatedJobId: string | null;
  relatedDomain: ProductionDomain | null;
  diagnostics: readonly OperationalDiagnostic[];
}

export interface OperationalEvent extends OperationalEventInput {
  eventId: string;
  occurredAt: TimezoneAwareIsoDateTime;
  fingerprint: string;
  incidentId: string;
}

export interface OperationalIncident {
  incidentId: string;
  fingerprint: string;
  severity: OperationalSeverity;
  status: IncidentStatus;
  firstOccurredAt: TimezoneAwareIsoDateTime;
  lastOccurredAt: TimezoneAwareIsoDateTime;
  occurrenceCount: number;
  source: string;
  component: string;
  errorCode: string;
  summary: string;
  causeStatus: CauseStatus;
  knownCause: string | null;
  impact: MonitoringImpact;
  relatedEvents: readonly string[];
  relatedRequestIds: readonly string[];
  relatedBatchIds: readonly string[];
  relatedJobIds: readonly string[];
  acknowledgedAt: TimezoneAwareIsoDateTime | null;
  acknowledgedBy: string | null;
  lastNotifiedAt: TimezoneAwareIsoDateTime | null;
  resolvedAt: TimezoneAwareIsoDateTime | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  recoverySignal: string | null;
  revision: number;
}

export interface MonitoringAuditEvent {
  auditId: string;
  incidentId: string | null;
  notificationId: string | null;
  jobId: string | null;
  operation: "ACKNOWLEDGE" | "RESOLVE" | "REOPEN" | "RETRY_NOTIFICATION" | "JOB_REGISTER";
  actorPrincipalId: string;
  occurredAt: TimezoneAwareIsoDateTime;
  outcome: "SUCCEEDED" | "REJECTED" | "FAILED";
  safeDetail: string;
  correlationId: string | null;
}

export interface NotificationOutboxItem {
  notificationId: string;
  incidentId: string;
  channel: NotificationChannel;
  recipient: string;
  template: "INCIDENT_OPENED" | "INCIDENT_REPEAT" | "INCIDENT_RECOVERED";
  status: NotificationStatus;
  attemptCount: number;
  nextRetryAt: TimezoneAwareIsoDateTime | null;
  lastAttemptAt: TimezoneAwareIsoDateTime | null;
  providerAcceptedAt: TimezoneAwareIsoDateTime | null;
  deliveredAt: TimezoneAwareIsoDateTime | null;
  failureReason: string | null;
  idempotencyKey: string;
  leaseUntil: TimezoneAwareIsoDateTime | null;
  createdAt: TimezoneAwareIsoDateTime;
}

export interface NotificationMessage {
  systemName: string;
  severity: OperationalSeverity;
  title: string;
  occurredAt: TimezoneAwareIsoDateTime;
  component: string;
  errorCode: string;
  cause: string;
  impact: string;
  actionTaken: string;
  nextStep: string;
  incidentId: string;
  detailUrl: string;
  occurrenceCount: number;
}

export interface NotificationProviderResult {
  confirmation: NotificationDeliveryConfirmation;
  providerMessageId: string | null;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(input: { recipient: string; message: NotificationMessage; idempotencyKey: string }): Promise<NotificationProviderResult>;
}

export interface JobMonitoringPolicy {
  jobId: string;
  jobName: string;
  firstExpectedAt: TimezoneAwareIsoDateTime;
  expectedIntervalMs: number;
  allowedDelayMs: number;
  maxRuntimeMs: number;
  maxHeartbeatAgeMs: number;
}

export interface JobMonitoringState {
  jobId: string;
  jobName: string;
  expectedSchedule: string;
  startedAt: TimezoneAwareIsoDateTime | null;
  completedAt: TimezoneAwareIsoDateTime | null;
  lastHeartbeatAt: TimezoneAwareIsoDateTime | null;
  executionStatus: JobExecutionStatus;
  executionId: string | null;
  failureReason: string | null;
  lastSuccessAt: TimezoneAwareIsoDateTime | null;
}

export interface JobExecutionUpdate {
  jobId: string;
  jobName: string;
  expectedSchedule: string;
  executionId: string;
  executionStatus: Exclude<JobExecutionStatus, "NOT_STARTED">;
  startedAt: TimezoneAwareIsoDateTime;
  completedAt: TimezoneAwareIsoDateTime | null;
  lastHeartbeatAt: TimezoneAwareIsoDateTime;
  failureReason: string | null;
}

export interface MonitoringQuery {
  since?: TimezoneAwareIsoDateTime;
  until?: TimezoneAwareIsoDateTime;
  severity?: OperationalSeverity | "ALL";
  status?: IncidentStatus | "ALL";
  source?: string | "ALL";
  limit?: number;
}

export interface MonitoringSnapshot {
  incidents: readonly OperationalIncident[];
  events: readonly OperationalEvent[];
  notifications: readonly NotificationOutboxItem[];
  jobs: readonly JobMonitoringState[];
  audit: readonly MonitoringAuditEvent[];
  sampledAt: TimezoneAwareIsoDateTime;
}

export type MonitoringImportDiagnostic = ImportDiagnostic;
