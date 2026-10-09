import { describe, expect, it } from "vitest";
import type { TimezoneAwareIsoDateTime, StoreMasterData } from "@/types/ehs";
import type { ImportDiagnostic, MachinePrincipal } from "@/data/contracts/production-import";
import { MemoryImportBatchStore } from "./testing/memory-import-batch-store";
import { ImportRequestError, ProductionImportService } from "./production-import-service";

const date = "2026-10-09T10:00:00Z" as TimezoneAwareIsoDateTime;
const store: StoreMasterData = { region: "R1", area: "A1", storeNameCn: "门店", storeNameEn: "Store One", trtid: "S-1", regionOwner: null, regionOwnerEmail: null, areaOwner: null, areaOwnerEmail: null, manager: null, managerEmail: null, ehsAmbassador: null, ehsAmbassadorEmail: null };
const principal: MachinePrincipal = { principalId: "integration", allowedDomains: ["events"], allowedOperations: ["SUBMIT", "READ", "VALIDATE", "PUBLISH"] };
const input = {
  schemaVersion: "v1", sourceSystem: "integration-test", domain: "events", batchId: "batch-1", extractionTime: date,
  coverage: { completeness: "COMPLETE", proof: { kind: "SOURCE_CONTROL_TOTAL", reference: "control:events:2026-10", controlRecordCount: 1 }, stores: [{ trtid: "S-1" }], businessPeriod: { startInclusive: "2026-10-01T00:00:00+08:00", endExclusive: "2026-11-01T00:00:00+08:00" } }, expectedRecordCount: 1, idempotencyKey: "idempotency-1",
  records: [{ eventId: "E-1", storeReference: { trtid: "S-1" }, eventType: "Agency", submittedBy: "Person", eventDate: "2026-10-01T09:00:00+08:00", EventDetail: { Description: "Incident" }, Status: "Open", ASTMInjuryIllness: "No" }],
};
function setup(verifyCoverageProof: (batch: import("@/data/contracts/production-import").ProductionImportBatch) => Promise<boolean> = async () => true) {
  const storeAdapter = new MemoryImportBatchStore();
  const service = new ProductionImportService(storeAdapter, () => date, async () => [store], verifyCoverageProof);
  return { storeAdapter, service };
}

describe("ProductionImportService", () => {
  it("requires scoped machine identity and accepts only permitted domains", async () => {
    const { service } = setup();
    await expect(service.submit(null, input)).rejects.toMatchObject({ code: "MACHINE_AUTHENTICATION_REQUIRED" });
    await expect(service.submit({ ...principal, allowedDomains: [] }, input)).rejects.toMatchObject({ code: "DOMAIN_NOT_AUTHORIZED" });
    await expect(service.submit({ ...principal, allowedOperations: ["READ"] }, input)).rejects.toMatchObject({ code: "OPERATION_NOT_AUTHORIZED" });
  });

  it("supports idempotent retry and atomic validated publication", async () => {
    const { storeAdapter, service } = setup();
    const first = await service.submit(principal, input);
    const retry = await service.submit(principal, input);
    expect(retry.batchId).toBe(first.batchId);
    await expect(service.submit(principal, { ...input, records: [{ ...input.records[0], submittedBy: "Changed" }] })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_BODY" });
    expect(await service.validate(principal, first.batchId)).toMatchObject({ state: "VALIDATED", diagnostics: [] });
    const published = await service.publish(principal, first.batchId, "publish-request-1");
    expect(published).toMatchObject({ state: "PUBLISHED", createdByPrincipalId: principal.principalId, coverageAssessment: "VERIFIED_COMPLETE" });
    expect(published.audit.map(({ operation, actorPrincipalId, requestId }) => ({ operation, actorPrincipalId, requestId }))).toEqual([
      { operation: "SUBMIT", actorPrincipalId: principal.principalId, requestId: "unknown-request" },
      { operation: "VALIDATE", actorPrincipalId: principal.principalId, requestId: "unknown-request" },
      { operation: "PUBLISH", actorPrincipalId: principal.principalId, requestId: "publish-request-1" },
    ]);
    expect((await service.publish(principal, first.batchId)).publishedAt).toBe(published.publishedAt);
    expect(storeAdapter.publishedBatch("events")?.batchId).toBe(first.batchId);
  });

  it("applies deterministic idempotency and batch-id conflicts under concurrent submissions", async () => {
    const { service } = setup();
    const [first, retry] = await Promise.all([service.submit(principal, input), service.submit(principal, input)]);
    expect(first.batchId).toBe(retry.batchId);
    const duplicateIdentity = await Promise.allSettled([
      service.submit(principal, { ...input, batchId: "concurrent-identity", idempotencyKey: "different-key" }),
      service.submit(principal, { ...input, batchId: "concurrent-identity", idempotencyKey: "another-key" }),
    ]);
    expect(duplicateIdentity.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(duplicateIdentity.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("rejects unknown Store references and partial coverage", async () => {
    const { service } = setup();
    const unknown = await service.submit(principal, { ...input, batchId: "unknown-store", idempotencyKey: "unknown", records: [{ ...input.records[0], storeReference: { trtid: "missing" } }] });
    const failed = await service.validate(principal, unknown.batchId);
    expect(failed.state).toBe("REJECTED");
    expect(failed.diagnostics.map(({ code }) => code)).toContain("UNKNOWN_STORE");
    const partial = await service.submit(principal, { ...input, batchId: "partial", idempotencyKey: "partial", coverage: { ...input.coverage, completeness: "PARTIAL" } });
    await expect(service.publish(principal, partial.batchId)).rejects.toMatchObject({ code: "BATCH_NOT_VALIDATED" });
    expect((await service.validate(principal, partial.batchId)).diagnostics.map(({ code }) => code)).toContain("PARTIAL_COVERAGE_NOT_PUBLISHABLE");
  });

  it("does not return an Import Batch outside the caller's Domain scope", async () => {
    const { service } = setup();
    const batch = await service.submit(principal, input);
    await expect(service.get({ ...principal, allowedDomains: [] }, batch.batchId)).rejects.toMatchObject({ status: 404, code: "BATCH_NOT_FOUND" });
  });

  it("rejects source records outside the declared complete coverage", async () => {
    const { service } = setup();
    const batch = await service.submit(principal, {
      ...input,
      batchId: "coverage-mismatch",
      idempotencyKey: "coverage-mismatch",
      coverage: { ...input.coverage, stores: [] },
    });
    const result = await service.validate(principal, batch.batchId);
    expect(result.state).toBe("REJECTED");
    expect(result.diagnostics.map(({ code }) => code)).toContain("COVERAGE_MISMATCH");
  });

  it("keeps declared coverage distinct from independently verified coverage", async () => {
    const { service } = setup(async () => false);
    const batch = await service.submit(principal, { ...input, batchId: "unverified", idempotencyKey: "unverified" });
    const result = await service.validate(principal, batch.batchId);
    expect(result.coverageAssessment).toBe("DECLARED_COMPLETE");
    expect(result.diagnostics.map(({ code }) => code)).toContain("COVERAGE_PROOF_UNVERIFIED");
    expect(result.audit.at(-1)).toMatchObject({ operation: "VALIDATE", actorPrincipalId: principal.principalId, outcome: "REJECTED" });
    await expect(service.publish(principal, batch.batchId)).rejects.toMatchObject({ code: "BATCH_NOT_VALIDATED" });
  });

  it("preserves unknown source completeness as UNKNOWN and blocks publication", async () => {
    const { service } = setup();
    const batch = await service.submit(principal, {
      ...input,
      batchId: "unknown-coverage",
      idempotencyKey: "unknown-coverage",
      coverage: { ...input.coverage, completeness: "UNKNOWN", proof: undefined },
    });
    const result = await service.validate(principal, batch.batchId);
    expect(result.state).toBe("REJECTED");
    expect(result.coverageAssessment).toBe("UNKNOWN");
    expect(result.diagnostics.map(({ code }) => code)).toContain("COVERAGE_COMPLETENESS_UNKNOWN");
  });

  it("preserves unknown source completeness as UNKNOWN and blocks publication", async () => {
    const { service } = setup();
    const batch = await service.submit(principal, {
      ...input,
      batchId: "unknown-coverage",
      idempotencyKey: "unknown-coverage",
      coverage: { ...input.coverage, completeness: "UNKNOWN", proof: undefined },
    });
    const result = await service.validate(principal, batch.batchId);
    expect(result.state).toBe("REJECTED");
    expect(result.coverageAssessment).toBe("UNKNOWN");
    expect(result.diagnostics.map(({ code }) => code)).toContain("COVERAGE_COMPLETENESS_UNKNOWN");
  });

  it("rejects a source control total that disagrees with the submitted record set", async () => {
    const { service } = setup(async () => true);
    const batch = await service.submit(principal, {
      ...input,
      batchId: "control-mismatch",
      idempotencyKey: "control-mismatch",
      coverage: { ...input.coverage, proof: { ...input.coverage.proof, controlRecordCount: 2 } },
    });
    const result = await service.validate(principal, batch.batchId);
    expect(result.state).toBe("REJECTED");
    expect(result.diagnostics.map(({ code }) => code)).toContain("SOURCE_CONTROL_COUNT_MISMATCH");
    expect(result.coverageAssessment).toBe("DECLARED_COMPLETE");
  });

  it("rejects stale concurrent validation and never rewrites a published terminal state", async () => {
    const { storeAdapter, service } = setup();
    const batch = await service.submit(principal, input);
    const fetched = await storeAdapter.getAuthorized(batch.batchId, principal.allowedDomains);
    expect(fetched).not.toBeNull();
    const diagnostics: ImportDiagnostic[] = [];
    const audit = { operation: "VALIDATE" as const, actorPrincipalId: principal.principalId, occurredAt: date, outcome: "VALIDATED" as const, requestId: "race", diagnostics };
    await storeAdapter.recordValidation(batch.batchId, fetched!.revision, diagnostics, true, "VERIFIED_COMPLETE", audit);
    await expect(storeAdapter.recordValidation(batch.batchId, fetched!.revision, diagnostics, false, "DECLARED_COMPLETE", { ...audit, outcome: "REJECTED" })).rejects.toBeInstanceOf(Error);
    const validated = await storeAdapter.getAuthorized(batch.batchId, principal.allowedDomains);
    const publishAudit = { ...audit, operation: "PUBLISH" as const, outcome: "PUBLISHED" as const };
    await storeAdapter.publishAtomically(batch.batchId, validated!.revision, date, publishAudit);
    await expect(storeAdapter.recordValidation(batch.batchId, validated!.revision, diagnostics, false, "DECLARED_COMPLETE", { ...audit, outcome: "REJECTED" })).rejects.toBeInstanceOf(Error);
    expect(await storeAdapter.getAuthorized(batch.batchId, principal.allowedDomains)).toMatchObject({ state: "PUBLISHED" });
  });

  it("preserves the prior published batch when publication fails", async () => {
    const { storeAdapter, service } = setup();
    const first = await service.submit(principal, input);
    await service.validate(principal, first.batchId);
    await service.publish(principal, first.batchId);
    const second = await service.submit(principal, { ...input, batchId: "batch-2", idempotencyKey: "idempotency-2" });
    await service.validate(principal, second.batchId);
    storeAdapter.failNextPublish = true;
    await expect(service.publish(principal, second.batchId)).rejects.toMatchObject({ code: "ATOMIC_PUBLISH_UNAVAILABLE" });
    expect(storeAdapter.publishedBatch("events")?.batchId).toBe(first.batchId);
    expect(await storeAdapter.getAuthorized(second.batchId, principal.allowedDomains)).toMatchObject({ audit: expect.arrayContaining([expect.objectContaining({ operation: "PUBLISH", outcome: "FAILED", actorPrincipalId: principal.principalId })]) });
  });

  it("returns controlled HTTP errors when runtime or request is invalid", async () => {
    const { service } = setup();
    const unavailable = await (await import("./production-import-service")).handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
      () => { throw new Error("PRODUCTION_IMPORT_RUNTIME_NOT_CONFIGURED"); },
      async () => principal,
      { kind: "submit" },
    );
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ error: { code: "PRODUCTION_IMPORT_NOT_CONFIGURED" } });
    const failedDependency = await (await import("./production-import-service")).handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
      () => { throw new Error("database connection unavailable"); },
      async () => principal,
      { kind: "submit" },
    );
    expect(failedDependency.status).toBe(503);
    expect(await failedDependency.json()).toMatchObject({ error: { code: "IMPORT_SERVICE_UNAVAILABLE", message: "生产导入服务暂不可用。" } });
    const malformed = await (await import("./production-import-service")).handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }),
      () => service,
      async () => principal,
      { kind: "submit" },
    );
    expect(malformed.status).toBe(400);
    const unauthenticated = await (await import("./production-import-service")).handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
      () => service,
      async () => null,
      { kind: "submit" },
    );
    expect(unauthenticated.status).toBe(401);
    const unauthorizedOperation = await (await import("./production-import-service")).handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches/batch-1", { method: "GET" }),
      () => { throw new Error("runtime must remain uninitialized"); },
      async () => ({ ...principal, allowedOperations: [] }),
      { kind: "get", batchId: "batch-1" },
    );
    expect(unauthorizedOperation.status).toBe(403);
  });

  it("does not initialize protected import runtime for unauthenticated or out-of-scope submitters", async () => {
    const { service } = setup();
    let initialized = 0;
    const handle = async (identity: MachinePrincipal | null) => (await import("./production-import-service")).handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
      () => { initialized += 1; return service; },
      async () => identity,
      { kind: "submit" },
    );
    expect((await handle(null)).status).toBe(401);
    expect((await handle({ ...principal, allowedDomains: [] })).status).toBe(403);
    expect((await handle({ ...principal, allowedOperations: ["READ"] })).status).toBe(403);
    expect(initialized).toBe(0);
  });

  it("rejects unauthenticated batch status/validate/publish before resolving protected runtime", async () => {
    const { service } = setup();
    let initialized = 0;
    const { handleImportApiRequest } = await import("./production-import-service");
    for (const kind of ["get", "validate", "publish"] as const) {
      const response = await handleImportApiRequest(
        new Request(`https://dashboard.invalid/api/v1/import/batches/batch-1${kind === "get" ? "" : `/${kind}`}`, { method: kind === "get" ? "GET" : "POST" }),
        () => { initialized += 1; return service; },
        async () => null,
        { kind, batchId: "batch-1" },
      );
      expect(response.status).toBe(401);
    }
    expect(initialized).toBe(0);
  });
});
