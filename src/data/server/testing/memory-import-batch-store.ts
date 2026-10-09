import type { CoverageAssessment, ImportActor, ImportAuditEvent, ProductionImportBatch, ProductionImportBatchInput } from "@/data/contracts/production-import";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import { BatchIdConflictError, BatchNotFoundError, BatchStateConflictError, IdempotencyConflictError, type ImportBatchStore } from "@/data/repositories/production-import-batch-store";

/** Test-only store. Never imported by a production route or repository. */
export class MemoryImportBatchStore implements ImportBatchStore {
  private readonly batches = new Map<string, ProductionImportBatch>();
  private readonly idempotency = new Map<string, string>();
  private readonly published = new Map<string, ProductionImportBatch>();
  failNextPublish = false;
  private canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((item) => this.canonical(item)).join(",")}]`;
    if (value && typeof value === "object") {
      const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
      return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${this.canonical(item)}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  async createOrGet(input: ProductionImportBatchInput, receivedAt: TimezoneAwareIsoDateTime, actor: ImportActor) {
    const key = `${input.sourceSystem}\u0000${input.domain}\u0000${input.idempotencyKey}`;
    const priorId = this.idempotency.get(key);
    if (priorId) {
      const previous = this.batches.get(priorId)!;
      const { state: _state, receivedAt: _receivedAt, publishedAt: _publishedAt, diagnostics: _diagnostics, createdByPrincipalId: _creator, revision: _revision, coverageAssessment: _coverageAssessment, audit: _audit, ...previousInput } = previous;
      if (this.canonical(previousInput) !== this.canonical(input)) throw new IdempotencyConflictError(input.idempotencyKey);
      return { batch: previous, replayed: true };
    }
    if (this.batches.has(input.batchId)) throw new BatchIdConflictError(input.batchId);
    const event: ImportAuditEvent = { operation: "SUBMIT", actorPrincipalId: actor.principalId, occurredAt: receivedAt, outcome: "ACCEPTED", requestId: actor.requestId, diagnostics: [] };
    const coverageAssessment = input.coverage.completeness === "COMPLETE" ? "DECLARED_COMPLETE" : input.coverage.completeness === "PARTIAL" ? "INCOMPLETE" : "UNKNOWN";
    const batch: ProductionImportBatch = { ...input, createdByPrincipalId: actor.principalId, revision: 1, coverageAssessment, audit: [event], state: "RECEIVED", receivedAt, publishedAt: null, diagnostics: [] };
    this.batches.set(input.batchId, batch);
    this.idempotency.set(key, input.batchId);
    return { batch, replayed: false };
  }
  async getAuthorized(batchId: string, allowedDomains: readonly ProductionImportBatch["domain"][]) {
    const batch = this.batches.get(batchId);
    return batch && allowedDomains.includes(batch.domain) ? batch : null;
  }
  async recordValidation(batchId: string, expectedRevision: number, diagnostics: ProductionImportBatch["diagnostics"], valid: boolean, coverageAssessment: CoverageAssessment, audit: ImportAuditEvent) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new BatchNotFoundError(batchId);
    if (batch.revision !== expectedRevision || batch.state === "PUBLISHED" || (batch.state !== "RECEIVED" && batch.state !== "REJECTED")) throw new BatchStateConflictError(batchId);
    const next = { ...batch, revision: batch.revision + 1, coverageAssessment, state: valid ? "VALIDATED" as const : "REJECTED" as const, diagnostics, audit: [...batch.audit, audit] };
    this.batches.set(batchId, next);
    return next;
  }
  async publishAtomically(batchId: string, expectedRevision: number, publishedAt: TimezoneAwareIsoDateTime, audit: ImportAuditEvent) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new BatchNotFoundError(batchId);
    if (batch.state === "PUBLISHED") return batch;
    if (batch.revision !== expectedRevision || batch.state !== "VALIDATED" || batch.coverageAssessment !== "VERIFIED_COMPLETE") throw new BatchStateConflictError(batchId);
    if (this.failNextPublish) { this.failNextPublish = false; throw new Error("SIMULATED_PUBLISH_FAILURE"); }
    const next = { ...batch, revision: batch.revision + 1, audit: [...batch.audit, audit], state: "PUBLISHED" as const, publishedAt };
    this.published.set(batch.domain, next);
    this.batches.set(batchId, next);
    return next;
  }
  async recordPublishFailure(batchId: string, expectedRevision: number, audit: ImportAuditEvent) {
    const batch = this.batches.get(batchId);
    if (!batch || batch.revision !== expectedRevision || batch.state === "PUBLISHED") return;
    this.batches.set(batchId, { ...batch, audit: [...batch.audit, audit] });
  }
  publishedBatch(domain: ProductionImportBatch["domain"]) { return this.published.get(domain) ?? null; }
}
