import type { ImportActor, ImportAuditEvent, ImportDiagnostic, MachinePrincipal, ProductionImportBatch } from "@/data/contracts/production-import";
import { parseProductionImportBatch } from "@/data/contracts/production-import-validation";
import { BatchIdConflictError, BatchNotFoundError, BatchStateConflictError, IdempotencyConflictError, type ImportBatchStore } from "@/data/repositories/production-import-batch-store";
import type { StoreMasterData } from "@/types/ehs";
import { createStoreReferenceResolver } from "@/data/resolve-store-reference";
import { validateProductionBatchStoreLinks } from "@/data/contracts/production-import-validation";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

export class ImportRequestError extends Error {
  constructor(readonly status: number, readonly code: string, readonly diagnostics: readonly ImportDiagnostic[] = []) { super(code); }
}

export class ProductionImportService {
  constructor(
    private readonly store: ImportBatchStore,
    private readonly now: () => TimezoneAwareIsoDateTime,
    private readonly readPublishedStores: () => Promise<readonly StoreMasterData[]>,
    private readonly verifyCoverageProof: (batch: ProductionImportBatch) => Promise<boolean> = async () => false,
  ) {}

  async submit(principal: MachinePrincipal | null, input: unknown, requestId = "unknown-request"): Promise<ProductionImportBatch> {
    if (!principal) throw new ImportRequestError(401, "MACHINE_AUTHENTICATION_REQUIRED");
    if (!principal.allowedOperations.includes("SUBMIT")) throw new ImportRequestError(403, "OPERATION_NOT_AUTHORIZED");
    const parsed = parseProductionImportBatch(input);
    if (!parsed.value) throw new ImportRequestError(422, "BATCH_VALIDATION_FAILED", parsed.diagnostics);
    if (!principal.allowedDomains.includes(parsed.value.domain)) throw new ImportRequestError(403, "DOMAIN_NOT_AUTHORIZED");
    try {
      const receivedAt = this.now();
      const result = await this.store.createOrGet(parsed.value, receivedAt, { principalId: principal.principalId, requestId });
      return result.batch;
    } catch (error) {
      if (error instanceof BatchIdConflictError) throw new ImportRequestError(409, "BATCH_ID_CONFLICT");
      if (error instanceof IdempotencyConflictError) throw new ImportRequestError(409, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_BODY");
      throw error;
    }
  }

  async get(principal: MachinePrincipal | null, batchId: string, operation: "READ" | "VALIDATE" | "PUBLISH" = "READ"): Promise<ProductionImportBatch> {
    if (!principal) throw new ImportRequestError(401, "MACHINE_AUTHENTICATION_REQUIRED");
    if (!principal.allowedOperations.includes(operation)) throw new ImportRequestError(403, "OPERATION_NOT_AUTHORIZED");
    if (typeof batchId !== "string" || !batchId.trim() || batchId.length > 160) throw new ImportRequestError(400, "INVALID_BATCH_ID");
    const batch = await this.store.getAuthorized(batchId, principal.allowedDomains);
    if (!batch) throw new ImportRequestError(404, "BATCH_NOT_FOUND");
    return batch;
  }

  async validate(principal: MachinePrincipal | null, batchId: string, requestId = "unknown-request"): Promise<ProductionImportBatch> {
    const batch = await this.get(principal, batchId, "VALIDATE");
    if (batch.state === "VALIDATED" || batch.state === "PUBLISHED") return batch;
    if (batch.state !== "RECEIVED" && batch.state !== "REJECTED") throw new ImportRequestError(409, "INVALID_BATCH_STATE");
    const { state: _state, receivedAt: _receivedAt, publishedAt: _publishedAt, diagnostics: _diagnostics, createdByPrincipalId: _creator, revision: _revision, coverageAssessment: _coverageAssessment, audit: _audit, ...input } = batch;
    const parsed = parseProductionImportBatch(input);
    const diagnostics = [...parsed.diagnostics];
    if (parsed.value && parsed.value.domain !== "store-master") {
      const stores = await this.readPublishedStores();
      diagnostics.push(...validateProductionBatchStoreLinks(parsed.value, createStoreReferenceResolver(stores)));
    }
    let verifiedCoverage = false;
    if (batch.coverage.completeness === "COMPLETE" && batch.coverage.proof) {
      const proof = batch.coverage.proof;
      const recordCountMatches = (proof.kind !== "SOURCE_CONTROL_TOTAL" && proof.kind !== "AUTHORITATIVE_EMPTY") || proof.controlRecordCount === batch.records.length;
      if (!recordCountMatches) diagnostics.push({ domain: batch.domain, batchId, recordIndex: null, recordId: null, field: "coverage.proof.controlRecordCount", code: "SOURCE_CONTROL_COUNT_MISMATCH", message: "独立来源控制数与批次记录数不一致。", severity: "ERROR" });
      verifiedCoverage = recordCountMatches && await this.verifyCoverageProof(batch);
      if (!verifiedCoverage) diagnostics.push({ domain: batch.domain, batchId, recordIndex: null, recordId: null, field: "coverage.proof", code: "COVERAGE_PROOF_UNVERIFIED", message: "来源已声明完整，但当前未配置独立来源证明校验器；expectedRecordCount 自洽不代表来源完整。", severity: "ERROR" });
    }
    if (batch.coverage.completeness === "PARTIAL") diagnostics.push({ domain: batch.domain, batchId, recordIndex: null, recordId: null, field: "coverage.completeness", code: "PARTIAL_COVERAGE_NOT_PUBLISHABLE", message: "部分覆盖批次可以隔离检查，但不能发布为正式数据。", severity: "ERROR" });
    if (batch.coverage.completeness === "UNKNOWN") diagnostics.push({ domain: batch.domain, batchId, recordIndex: null, recordId: null, field: "coverage.completeness", code: "COVERAGE_COMPLETENESS_UNKNOWN", message: "无法确认来源覆盖是否完整；批次仅可隔离检查，不能发布为正式数据。", severity: "ERROR" });
    if (batch.coverage.completeness === "COMPLETE" && !batch.coverage.proof) diagnostics.push({ domain: batch.domain, batchId, recordIndex: null, recordId: null, field: "coverage.proof", code: "COVERAGE_PROOF_REQUIRED", message: "来源仅声明完整；正式发布需要独立来源证明。", severity: "ERROR" });
    const valid = diagnostics.every((item) => item.severity !== "ERROR");
    const actor = principal!;
    const audit: ImportAuditEvent = { operation: "VALIDATE", actorPrincipalId: actor.principalId, occurredAt: this.now(), outcome: valid ? "VALIDATED" : "REJECTED", requestId, diagnostics };
    const coverageAssessment = batch.coverage.completeness === "UNKNOWN"
      ? "UNKNOWN"
      : batch.coverage.completeness === "PARTIAL"
        ? "INCOMPLETE"
        : verifiedCoverage && valid ? "VERIFIED_COMPLETE" : "DECLARED_COMPLETE";
    try { return await this.store.recordValidation(batchId, batch.revision, diagnostics, valid, coverageAssessment, audit); }
    catch (error) { if (error instanceof BatchStateConflictError) throw new ImportRequestError(409, "BATCH_CHANGED_DURING_VALIDATION"); throw error; }
  }

  async publish(principal: MachinePrincipal | null, batchId: string, requestId = "unknown-request"): Promise<ProductionImportBatch> {
    const batch = await this.get(principal, batchId, "PUBLISH");
    if (batch.state === "PUBLISHED") return batch;
    if (batch.state !== "VALIDATED") throw new ImportRequestError(409, "BATCH_NOT_VALIDATED");
    if (batch.coverageAssessment !== "VERIFIED_COMPLETE") throw new ImportRequestError(409, "VERIFIED_COVERAGE_REQUIRED");
    const actor = principal!;
    const publishedAt = this.now();
    const audit: ImportAuditEvent = { operation: "PUBLISH", actorPrincipalId: actor.principalId, occurredAt: publishedAt, outcome: "PUBLISHED", requestId, diagnostics: [] };
    try { return await this.store.publishAtomically(batchId, batch.revision, publishedAt, audit); }
    catch (error) {
      if (error instanceof BatchNotFoundError) throw new ImportRequestError(404, "BATCH_NOT_FOUND");
      const conflict = error instanceof BatchStateConflictError;
      const diagnostic: ImportDiagnostic = { domain: batch.domain, batchId, recordIndex: null, recordId: null, field: null, code: conflict ? "PUBLISH_STATE_CONFLICT" : "ATOMIC_PUBLISH_FAILED", message: conflict ? "批次状态已变化，发布未执行。" : "原子发布失败，原已发布数据保持有效。", severity: "ERROR" };
      const failedAudit: ImportAuditEvent = { ...audit, outcome: conflict ? "CONFLICT" : "FAILED", diagnostics: [diagnostic] };
      try { await this.store.recordPublishFailure(batchId, batch.revision, failedAudit); } catch { /* Preserve the safe API response if audit persistence is unavailable. */ }
      if (conflict) throw new ImportRequestError(409, "BATCH_NOT_VALIDATED", [diagnostic]);
      throw new ImportRequestError(503, "ATOMIC_PUBLISH_UNAVAILABLE", [diagnostic]);
    }
  }
}

export type ImportPrincipalResolver = (request: Request) => Promise<MachinePrincipal | null>;
export type ProductionImportServiceResolver = () => ProductionImportService;

async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new ImportRequestError(415, "JSON_CONTENT_TYPE_REQUIRED");
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  const limit = 10 * 1024 * 1024;
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new ImportRequestError(413, "REQUEST_TOO_LARGE");
  if (!request.body) throw new ImportRequestError(400, "REQUEST_BODY_REQUIRED");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new ImportRequestError(413, "REQUEST_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function handleImportApiRequest(
  request: Request,
  serviceResolver: ProductionImportServiceResolver,
  principalResolver: ImportPrincipalResolver,
  operation: { kind: "submit" } | { kind: "get" | "validate" | "publish"; batchId: string },
): Promise<Response> {
  try {
    const principal = await principalResolver(request);
    if (!principal || !principal.principalId.trim()) throw new ImportRequestError(401, "MACHINE_AUTHENTICATION_REQUIRED");
    const requestIdHeader = request.headers.get("x-request-id") ?? request.headers.get("traceparent");
    const requestId = requestIdHeader && requestIdHeader.length <= 200 && /^[\w.:-]+$/.test(requestIdHeader) ? requestIdHeader : crypto.randomUUID();
    const requiredOperation = operation.kind === "submit" ? "SUBMIT" : operation.kind === "get" ? "READ" : operation.kind === "validate" ? "VALIDATE" : "PUBLISH";
    if (!principal.allowedOperations.includes(requiredOperation)) throw new ImportRequestError(403, "OPERATION_NOT_AUTHORIZED");
    let body: unknown;
    if (operation.kind === "submit") {
      body = await readBoundedJson(request);
      const parsed = parseProductionImportBatch(body);
      if (!parsed.value) throw new ImportRequestError(422, "BATCH_VALIDATION_FAILED", parsed.diagnostics);
      if (!principal.allowedDomains.includes(parsed.value.domain)) throw new ImportRequestError(403, "DOMAIN_NOT_AUTHORIZED");
    } else if (principal.allowedDomains.length === 0) {
      throw new ImportRequestError(403, "DOMAIN_NOT_AUTHORIZED");
    }
    const service = serviceResolver();
    const result = operation.kind === "submit"
      ? await service.submit(principal, body, requestId)
      : operation.kind === "get"
        ? await service.get(principal, operation.batchId)
        : operation.kind === "validate"
          ? await service.validate(principal, operation.batchId, requestId)
          : await service.publish(principal, operation.batchId, requestId);
    return Response.json(result, { status: operation.kind === "submit" ? 202 : 200 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: { code: "MALFORMED_JSON", message: "请求体不是有效 JSON。", diagnostics: [] } }, { status: 400 });
    const known = error instanceof ImportRequestError;
    const status = known ? error.status : 503;
    const code = known ? error.code : error instanceof Error && error.message === "PRODUCTION_IMPORT_RUNTIME_NOT_CONFIGURED"
      ? "PRODUCTION_IMPORT_NOT_CONFIGURED"
      : "IMPORT_SERVICE_UNAVAILABLE";
    const diagnostics = known ? error.diagnostics : [];
    const message = known ? error.message : code === "PRODUCTION_IMPORT_NOT_CONFIGURED" ? "生产导入依赖未配置。" : "生产导入服务暂不可用。";
    return Response.json({ error: { code, message, diagnostics } }, { status });
  }
}
