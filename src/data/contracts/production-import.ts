import type { StoreReference, TimezoneAwareIsoDateTime } from "@/types/ehs";

export const PRODUCTION_DOMAINS = [
  "store-master",
  "training",
  "drill",
  "inspection",
  "action-closure-rate",
  "events",
  "actions",
  "take-charge",
  "take-charge-annual-aggregates",
  "certificates",
  "environment",
  "required-sets",
] as const;

export type ProductionDomain = (typeof PRODUCTION_DOMAINS)[number];
export type ImportBatchState = "RECEIVED" | "VALIDATED" | "REJECTED" | "PUBLISHED";
export type ImportSeverity = "ERROR" | "WARNING";
export type CoverageAssessment = "DECLARED_COMPLETE" | "VERIFIED_COMPLETE" | "INCOMPLETE" | "UNKNOWN";

export interface CoverageProof {
  kind: "SOURCE_CONTROL_TOTAL" | "EXPORT_MANIFEST" | "SCOPE_DIGEST" | "AUTHORITATIVE_EMPTY";
  reference: string;
  controlRecordCount?: number;
  scope?: string;
  digest?: string;
}

export interface ImportAuditEvent {
  operation: "SUBMIT" | "VALIDATE" | "PUBLISH";
  actorPrincipalId: string;
  occurredAt: TimezoneAwareIsoDateTime;
  outcome: "ACCEPTED" | "VALIDATED" | "REJECTED" | "PUBLISHED" | "FAILED" | "CONFLICT";
  requestId: string;
  diagnostics: readonly ImportDiagnostic[];
}

export interface ImportDiagnostic {
  domain: ProductionDomain;
  batchId: string;
  recordIndex: number | null;
  recordId: string | null;
  field: string | null;
  code: string;
  message: string;
  severity: ImportSeverity;
}

export interface ProductionImportBatchInput {
  schemaVersion: "v1";
  sourceSystem: string;
  domain: ProductionDomain;
  batchId: string;
  extractionTime: TimezoneAwareIsoDateTime;
  sourceVersion?: string;
  configurationVersion?: string;
  businessPeriod?: { startInclusive: TimezoneAwareIsoDateTime; endExclusive: TimezoneAwareIsoDateTime };
  effectiveTime?: { startInclusive: TimezoneAwareIsoDateTime; endExclusive: TimezoneAwareIsoDateTime };
  coverage: {
    completeness: "COMPLETE" | "PARTIAL" | "UNKNOWN";
    proof?: CoverageProof;
    stores: readonly StoreReference[];
    businessPeriod?: { startInclusive: TimezoneAwareIsoDateTime; endExclusive: TimezoneAwareIsoDateTime };
  };
  expectedRecordCount: number;
  idempotencyKey: string;
  records: readonly unknown[];
}

export interface ProductionImportBatch extends ProductionImportBatchInput {
  createdByPrincipalId: string;
  revision: number;
  coverageAssessment: CoverageAssessment;
  audit: readonly ImportAuditEvent[];
  state: ImportBatchState;
  receivedAt: TimezoneAwareIsoDateTime;
  publishedAt: TimezoneAwareIsoDateTime | null;
  diagnostics: readonly ImportDiagnostic[];
}

export type ProductionImportBatchStatus = Omit<ProductionImportBatch, "records">;

export interface MachinePrincipal {
  principalId: string;
  allowedDomains: readonly ProductionDomain[];
  allowedOperations: readonly ("SUBMIT" | "READ" | "VALIDATE" | "PUBLISH")[];
}

export interface ImportActor {
  principalId: string;
  requestId: string;
}

export interface ProductionAccessPrincipal {
  principalId: string;
  verifiedEmail: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  attributes: Readonly<Record<string, string>>;
}
