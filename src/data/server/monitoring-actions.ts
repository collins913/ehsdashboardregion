"use server";

import type { IncidentStatus, MonitoringQuery, MonitoringSnapshot, OperationalSeverity } from "@/data/contracts/monitoring";
import { getMonitoringRepository } from "@/data/server/monitoring/monitoring-runtime.server";
import { acknowledgeOperationalIncident, reopenOperationalIncident, resolveOperationalIncident, retryOperationalNotification } from "@/data/server/monitoring/monitoring-service.server";
import { requireAdmin } from "@/lib/access/access-service.server";

const severities: readonly string[] = ["INFO", "WARNING", "ERROR", "CRITICAL", "ALL"];
const statuses: readonly string[] = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "ALL"];

function parseMonitoringQuery(input: unknown): MonitoringQuery {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["since", "until", "severity", "status", "source", "limit"].includes(key))) throw new Error("INVALID_MONITORING_QUERY");
  const iso = (value: unknown) => typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value)) ? value as MonitoringQuery["since"] : undefined;
  if (value.since !== undefined && !iso(value.since)) throw new Error("INVALID_MONITORING_QUERY");
  if (value.until !== undefined && !iso(value.until)) throw new Error("INVALID_MONITORING_QUERY");
  const since = iso(value.since);
  const until = iso(value.until);
  if (since && until && since > until) throw new Error("INVALID_MONITORING_QUERY");
  if (value.severity !== undefined && (typeof value.severity !== "string" || !severities.includes(value.severity))) throw new Error("INVALID_MONITORING_QUERY");
  if (value.status !== undefined && (typeof value.status !== "string" || !statuses.includes(value.status))) throw new Error("INVALID_MONITORING_QUERY");
  if (value.source !== undefined && (typeof value.source !== "string" || value.source.length > 80)) throw new Error("INVALID_MONITORING_QUERY");
  if (value.limit !== undefined && (!Number.isInteger(value.limit) || Number(value.limit) < 1 || Number(value.limit) > 200)) throw new Error("INVALID_MONITORING_QUERY");
  return {
    ...(since ? { since } : {}), ...(until ? { until } : {}),
    ...(value.severity ? { severity: value.severity as OperationalSeverity | "ALL" } : {}),
    ...(value.status ? { status: value.status as IncidentStatus | "ALL" } : {}),
    ...(value.source ? { source: value.source as string } : {}), ...(value.limit ? { limit: value.limit as number } : {}),
  };
}

export async function loadMonitoringSnapshot(input: unknown = {}): Promise<MonitoringSnapshot> {
  await requireAdmin();
  const query = parseMonitoringQuery(input);
  return getMonitoringRepository().listSnapshot(query, new Date().toISOString() as MonitoringSnapshot["sampledAt"]);
}

export async function acknowledgeMonitoringIncident(input: unknown) {
  const admin = await requireAdmin();
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_MONITORING_MUTATION");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["incidentId", "expectedRevision", "correlationId"].includes(key)) ||
      typeof value.incidentId !== "string" || value.incidentId.length > 100 || !Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 1) throw new Error("INVALID_MONITORING_MUTATION");
  return acknowledgeOperationalIncident(getMonitoringRepository(), {
    incidentId: value.incidentId, expectedRevision: value.expectedRevision as number,
    principalId: admin.principal.principalId, correlationId: typeof value.correlationId === "string" ? value.correlationId.slice(0, 200) : null,
  });
}

export async function resolveMonitoringIncident(input: unknown) {
  const admin = await requireAdmin();
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_MONITORING_MUTATION");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["incidentId", "expectedRevision", "note", "correlationId"].includes(key)) ||
      typeof value.incidentId !== "string" || value.incidentId.length > 100 || !Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 1 ||
      typeof value.note !== "string" || value.note.length > 500) throw new Error("INVALID_MONITORING_MUTATION");
  return resolveOperationalIncident(getMonitoringRepository(), {
    incidentId: value.incidentId, expectedRevision: value.expectedRevision as number,
    principalId: admin.principal.principalId, note: value.note,
    correlationId: typeof value.correlationId === "string" ? value.correlationId.slice(0, 200) : null,
  });
}

export async function reopenMonitoringIncident(input: unknown) {
  const admin = await requireAdmin();
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_MONITORING_MUTATION");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["incidentId", "expectedRevision", "correlationId"].includes(key)) ||
      typeof value.incidentId !== "string" || value.incidentId.length > 100 || !Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 1) throw new Error("INVALID_MONITORING_MUTATION");
  return reopenOperationalIncident(getMonitoringRepository(), {
    incidentId: value.incidentId, expectedRevision: value.expectedRevision as number,
    principalId: admin.principal.principalId, correlationId: typeof value.correlationId === "string" ? value.correlationId.slice(0, 200) : null,
  });
}

export async function retryMonitoringNotification(input: unknown) {
  const admin = await requireAdmin();
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => key !== "notificationId")) throw new Error("INVALID_MONITORING_MUTATION");
  const notificationId = (input as Record<string, unknown>).notificationId;
  if (typeof notificationId !== "string" || notificationId.length > 100) throw new Error("INVALID_MONITORING_MUTATION");
  return retryOperationalNotification(getMonitoringRepository(), { notificationId, principalId: admin.principal.principalId });
}
