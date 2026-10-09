import { describe, expect, it } from "vitest";
import { parseProductionImportBatch } from "./production-import-validation";

const valid = {
  schemaVersion: "v1", sourceSystem: "integration-test", domain: "events", batchId: "batch-1",
  extractionTime: "2026-10-09T10:00:00Z",
  coverage: { completeness: "COMPLETE", stores: [{ trtid: "S-1" }], businessPeriod: { startInclusive: "2026-10-01T00:00:00+08:00", endExclusive: "2026-11-01T00:00:00+08:00" } },
  expectedRecordCount: 1, idempotencyKey: "retry-1",
  records: [{ eventId: "E-1", storeReference: { trtid: "S-1" }, eventType: "Agency", submittedBy: "Person", eventDate: "2026-10-01T09:00:00+08:00", EventDetail: { Description: "Incident" }, Status: "Open", ASTMInjuryIllness: "No" }],
};

describe("production import batch schema", () => {
  it("accepts a contract-shaped batch", () => {
    expect(parseProductionImportBatch(valid).value).not.toBeNull();
  });

  it("rejects missing fields, invalid enum, count mismatch, and unexpected keys", () => {
    const batch = { ...valid, unexpected: true, expectedRecordCount: 2, records: [{ ...valid.records[0], ASTMInjuryIllness: "unknown" }] };
    const result = parseProductionImportBatch(batch);
    expect(result.value).toBeNull();
    expect(result.diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining(["UNEXPECTED_FIELD", "RECORD_COUNT_MISMATCH", "INVALID_ENUM"]));
  });

  it("rejects unsupported schema versions and malformed periods", () => {
    expect(parseProductionImportBatch({ ...valid, schemaVersion: "v2" }).diagnostics.map(({ code }) => code)).toContain("UNSUPPORTED_SCHEMA_VERSION");
    expect(parseProductionImportBatch({ ...valid, businessPeriod: { startInclusive: "2026-01-01", endExclusive: "2026-02-01" } }).diagnostics.map(({ code }) => code)).toContain("INVALID_PERIOD");
  });

  it("blocks unresolved Take Charge annual aggregate contract", () => {
    const batch = { ...valid, domain: "take-charge-annual-aggregates", records: [{}] };
    expect(parseProductionImportBatch(batch).diagnostics.map(({ code }) => code)).toContain("CONTRACT_TBD");
  });

  it("rejects duplicate event identities and impossible calendar dates", () => {
    const event = valid.records[0];
    const duplicate = parseProductionImportBatch({ ...valid, records: [event, event], expectedRecordCount: 2 });
    expect(duplicate.diagnostics.map(({ code }) => code)).toContain("DUPLICATE_RECORD_KEY");
    const inspection = parseProductionImportBatch({ ...valid, domain: "inspection", records: [{ inspectionNumber: "I-1", storeReference: { trtid: "S-1" }, inspectionName: "Check", dueDate: "2026-02-31", inspector: null, status: "已完成" }] });
    expect(inspection.diagnostics.map(({ code }) => code)).toContain("INVALID_DATE");
    const certificate = parseProductionImportBatch({ ...valid, domain: "certificates", effectiveTime: { startInclusive: "2026-01-01T00:00:00Z", endExclusive: "2027-01-01T00:00:00Z" }, records: [{ TRTID: "S-1", "Certificate Type": "Type", "Expiry Date": "2026-02-31", Person: "Person", "Person Email": "a@b", "Business Title": "Title" }] });
    expect(certificate.value).not.toBeNull();
    expect(certificate.diagnostics).toMatchObject([{ code: "INVALID_DATE_PRESERVED", severity: "WARNING" }]);
  });

  it("uses the Domain-specific date shape for Inspection and Actions dueDate", () => {
    const inspection = parseProductionImportBatch({
      ...valid,
      domain: "inspection",
      records: [{ inspectionNumber: "I-1", storeReference: { trtid: "S-1" }, inspectionName: "Check", dueDate: "2026-10-31", inspector: null, status: "已完成" }],
    });
    expect(inspection.value).not.toBeNull();
    expect(inspection.diagnostics).toEqual([]);

    const action = parseProductionImportBatch({
      ...valid,
      domain: "actions",
      records: [{ actionId: "A-1", storeReference: { trtid: "S-1" }, problem: "Problem", action: "Fix", submittedBy: "User", owner: "Owner", submittedDate: "2026-10-01T09:00:00+08:00", dueDate: "2026-10-02T09:00:00+08:00", closedDate: null, Status: "Open" }],
    });
    expect(action.value).not.toBeNull();
    expect(action.diagnostics).toEqual([]);
    const nullableActionDueDate = parseProductionImportBatch({
      ...valid,
      domain: "actions",
      records: [{ actionId: "A-1", storeReference: { trtid: "S-1" }, problem: "Problem", action: "Fix", submittedBy: "User", owner: "Owner", submittedDate: "2026-10-01T09:00:00+08:00", dueDate: null, closedDate: null, Status: "Open" }],
    });
    expect(nullableActionDueDate.diagnostics.map(({ code }) => code)).toContain("INVALID_DATETIME");
  });

  it("allows both required-set kinds for the same Store × Month but rejects duplicates per kind", () => {
    const base = { ...valid, domain: "required-sets", effectiveTime: { startInclusive: "2026-01-01T00:00:00Z", endExclusive: "2027-01-01T00:00:00Z" } };
    const training = { storeReference: { trtid: "S-1" }, month: "2026-10", requiredTrainingItems: ["T-1"] };
    const inspection = { storeReference: { trtid: "S-1" }, month: "2026-10", expectedInspectionTasks: ["I-1"] };
    const both = parseProductionImportBatch({ ...base, records: [training, inspection], expectedRecordCount: 2 });
    expect(both.value).not.toBeNull();
    expect(both.diagnostics).toEqual([]);
    const duplicate = parseProductionImportBatch({ ...base, records: [training, training], expectedRecordCount: 2 });
    expect(duplicate.diagnostics.map(({ code }) => code)).toContain("DUPLICATE_RECORD_KEY");
  });

  it("enforces batch identifiers, whitespace-only Store Master IDs, and provisional Training duplicate checks", () => {
    expect(parseProductionImportBatch({ ...valid, batchId: "x".repeat(161) }).diagnostics.map(({ code }) => code)).toContain("INVALID_BATCH_ID");
    expect(parseProductionImportBatch({ ...valid, idempotencyKey: "x".repeat(201) }).diagnostics.map(({ code }) => code)).toContain("INVALID_IDEMPOTENCY_KEY");
    const storeMaster = parseProductionImportBatch({
      ...valid,
      domain: "store-master",
      effectiveTime: { startInclusive: "2026-01-01T00:00:00Z", endExclusive: "2027-01-01T00:00:00Z" },
      coverage: { completeness: "PARTIAL", stores: [] },
      records: [{ region: "R", area: "A", storeNameCn: "门店", storeNameEn: "Store", trtid: "   " }],
    });
    expect(storeMaster.diagnostics.map(({ code }) => code)).toContain("INVALID_TRTID");
    const trainingRecord = { storeReference: { trtid: "S-1" }, month: "2026-10", trainingName: "T1", completionRate: 100, incompletePeople: [] };
    const training = parseProductionImportBatch({
      ...valid,
      domain: "training",
      records: [trainingRecord, trainingRecord],
      expectedRecordCount: 2,
    });
    expect(training.diagnostics.map(({ code }) => code)).toContain("DUPLICATE_RECORD_KEY");
  });

  it("rejects client-declared audit identity and malformed independent proof claims", () => {
    expect(parseProductionImportBatch({ ...valid, createdByPrincipalId: "spoofed" }).diagnostics.map(({ code }) => code)).toContain("UNEXPECTED_FIELD");
    expect(parseProductionImportBatch({ ...valid, coverage: { ...valid.coverage, proof: { kind: "AUTHORITATIVE_EMPTY", reference: "source", controlRecordCount: 1 } } }).diagnostics.map(({ code }) => code)).toContain("INVALID_COVERAGE");
    expect(parseProductionImportBatch({ ...valid, coverage: { ...valid.coverage, proof: { kind: "SOURCE_CONTROL_TOTAL", reference: "source" } } }).diagnostics.map(({ code }) => code)).toContain("INVALID_COVERAGE");
  });
});
