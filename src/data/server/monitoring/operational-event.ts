import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { OperationalDiagnostic, OperationalEventInput } from "@/data/contracts/monitoring";
import type { ProductionDomain } from "@/data/contracts/production-import";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import type { MonitoringEventWrite } from "@/data/repositories/monitoring/monitoring-repository";

const MAX_TEXT = 500;
const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\b(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\s*[:=]\s*[^\s,;]+/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b\+?\d[\d\s().-]{8,}\d\b/g,
];

export function redactOperationalText(value: unknown, maxLength = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  let safe = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  for (const pattern of SECRET_PATTERNS) safe = safe.replace(pattern, "[已过滤]");
  return safe.slice(0, maxLength);
}

function safeDiagnostic(input: OperationalDiagnostic): OperationalDiagnostic {
  return {
    code: /^[A-Z0-9_:.\-/]{1,100}$/.test(input.code) ? input.code : "UNCLASSIFIED_DIAGNOSTIC",
    ...(input.field ? { field: redactOperationalText(input.field, 120) } : {}),
    ...(input.recordId ? { recordId: redactOperationalText(input.recordId, 120) } : {}),
    severity: input.severity,
    message: redactOperationalText(input.message),
  };
}

export function normalizeOperationalEventInput(input: OperationalEventInput): OperationalEventInput {
  const knownCause = input.causeStatus === "KNOWN" ? redactOperationalText(input.knownCause) : null;
  return {
    environment: redactOperationalText(input.environment, 40) || "unknown",
    source: redactOperationalText(input.source, 80) || "unknown",
    component: redactOperationalText(input.component, 120) || "unknown",
    severity: input.severity,
    errorCode: /^[A-Z0-9_:.\-/]{1,100}$/.test(input.errorCode) ? input.errorCode : "UNCLASSIFIED_FAILURE",
    safeMessage: redactOperationalText(input.safeMessage),
    phenomenon: redactOperationalText(input.phenomenon),
    causeStatus: input.causeStatus,
    knownCause,
    impact: {
      kind: input.impact.kind,
      id: input.impact.id ? redactOperationalText(input.impact.id, 160) : null,
      summary: redactOperationalText(input.impact.summary),
    },
    actionTaken: redactOperationalText(input.actionTaken),
    nextStep: redactOperationalText(input.nextStep),
    correlationId: input.correlationId ? redactOperationalText(input.correlationId, 200) : null,
    relatedBatchId: input.relatedBatchId ? redactOperationalText(input.relatedBatchId, 160) : null,
    relatedJobId: input.relatedJobId ? redactOperationalText(input.relatedJobId, 160) : null,
    relatedDomain: input.relatedDomain,
    diagnostics: input.diagnostics.slice(0, 20).map(safeDiagnostic),
  };
}

export function operationalFingerprint(input: Pick<OperationalEventInput, "source" | "component" | "errorCode" | "impact">): string {
  const stableIdentity = [input.source, input.component, input.errorCode, input.impact.kind, input.impact.id ?? "*"].join("\u001f");
  return createHash("sha256").update(stableIdentity).digest("hex");
}

export function createMonitoringEventWrite(
  input: OperationalEventInput,
  occurredAt: TimezoneAwareIsoDateTime,
  notification: MonitoringEventWrite["notification"] = null,
): MonitoringEventWrite {
  const safeInput = normalizeOperationalEventInput(input);
  return {
    input: safeInput,
    eventId: randomUUID(),
    occurredAt,
    fingerprint: operationalFingerprint(safeInput),
    incidentId: randomUUID(),
    notification,
  };
}

export function isProductionDomain(value: unknown): value is ProductionDomain {
  return typeof value === "string" && [
    "store-master", "training", "drill", "inspection", "action-closure-rate", "events", "actions",
    "take-charge", "take-charge-annual-aggregates", "certificates", "environment", "required-sets",
  ].includes(value);
}
