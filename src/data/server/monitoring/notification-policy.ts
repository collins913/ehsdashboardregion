import type { OperationalIncident, OperationalSeverity } from "@/data/contracts/monitoring";

export interface NotificationPolicy {
  notifyWarnings: boolean;
  repeatSummaryIntervalMs: number;
  maxAttempts: number;
  retryDelaysMs: readonly number[];
}

export const DEFAULT_NOTIFICATION_POLICY: NotificationPolicy = {
  notifyWarnings: false,
  repeatSummaryIntervalMs: 60 * 60 * 1000,
  maxAttempts: 5,
  retryDelaysMs: [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 4 * 60 * 60_000],
};

export function shouldNotifyIncident(incident: OperationalIncident, policy: NotificationPolicy): boolean {
  return shouldNotifySeverity(incident.severity, incident.source, policy);
}

export function shouldNotifySeverity(severity: OperationalSeverity, source: string, policy: NotificationPolicy): boolean {
  if (source === "Notification") return false;
  if (severity === "CRITICAL" || severity === "ERROR") return true;
  return severity === "WARNING" && policy.notifyWarnings;
}

export function severityForFailure(status: number): OperationalSeverity {
  if (status >= 500) return status >= 503 ? "ERROR" : "ERROR";
  if (status === 429) return "WARNING";
  return "INFO";
}

export function retryAtForAttempt(attemptCount: number, nowMs: number, policy: NotificationPolicy): string | null {
  if (attemptCount >= policy.maxAttempts) return null;
  const delay = policy.retryDelaysMs[Math.min(Math.max(attemptCount - 1, 0), policy.retryDelaysMs.length - 1)];
  return new Date(nowMs + delay).toISOString();
}
