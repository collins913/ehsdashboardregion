import type { CoverageAssessment, ImportActor, ImportAuditEvent, ProductionImportBatch, ProductionImportBatchInput } from "@/data/contracts/production-import";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

export interface ImportBatchStore {
  /** Atomically enforces source/domain/idempotency uniqueness and persists trusted creator audit. */
  createOrGet(input: ProductionImportBatchInput, receivedAt: TimezoneAwareIsoDateTime, actor: ImportActor): Promise<{ batch: ProductionImportBatch; replayed: boolean }>;
  /** Apply Domain authorization in the storage predicate; never return an out-of-scope batch to the service. */
  getAuthorized(batchId: string, allowedDomains: readonly ProductionImportBatch["domain"][]): Promise<ProductionImportBatch | null>;
  /** Atomic CAS: update only if revision/state still match; a PUBLISHED row is immutable here. */
  recordValidation(batchId: string, expectedRevision: number, diagnostics: ProductionImportBatch["diagnostics"], valid: boolean, coverageAssessment: CoverageAssessment, audit: ImportAuditEvent): Promise<ProductionImportBatch>;
  /** Atomic transaction: CAS VALIDATED revision, replace scoped data, update pointer/state/audit; rollback all on failure. */
  publishAtomically(batchId: string, expectedRevision: number, publishedAt: TimezoneAwareIsoDateTime, audit: ImportAuditEvent): Promise<ProductionImportBatch>;
  /** Append a failed/conflicted publish audit without changing batch state or active data; conditional on the observed revision. */
  recordPublishFailure(batchId: string, expectedRevision: number, audit: ImportAuditEvent): Promise<void>;
}

export class BatchNotFoundError extends Error {}
export class BatchStateConflictError extends Error {}
export class BatchIdConflictError extends Error {}
export class IdempotencyConflictError extends Error {}
