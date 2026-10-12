import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseProductionImportBatch } from "./production-import-validation";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats").default;
const { load } = require("js-yaml");
const schemaId = "urn:ehs:production-import:tests";
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema({ ...load(readFileSync("docs/api/production-api-v1.yaml", "utf8")), $id: schemaId });
const validateOpenApi = ajv.compile({ $ref: `${schemaId}#/components/schemas/ImportBatchInput` });

const valid = {
  schemaVersion: "v1", sourceSystem: "integration-test", domain: "events", batchId: "batch-1",
  extractionTime: "2026-10-09T10:00:00Z",
  coverage: { completeness: "COMPLETE", stores: [{ trtid: "S-1" }], businessPeriod: { startInclusive: "2026-10-01T00:00:00+08:00", endExclusive: "2026-11-01T00:00:00+08:00" } },
  expectedRecordCount: 1, idempotencyKey: "retry-1",
  records: [{ eventId: "E-1", storeReference: { trtid: "S-1" }, eventType: "Agency", submittedBy: "Person", eventDate: "2026-10-01T09:00:00+08:00", EventDetail: { Description: "Incident" }, Status: "Open", ASTMInjuryIllness: "No" }],
};
const actionRecord = { actionId: "A-1", storeReference: { trtid: "S-1" }, problem: "Problem", action: "Fix", submittedBy: "User", owner: "Owner", submittedDate: "2026-10-01T09:00:00+08:00", dueDate: "2026-12-02T09:00:00+08:00", closedDate: null, Status: "Open" };
const takeChargeRecord = { storeReference: { trtid: "S-1" }, tchId: "T-1", submittedBy: "Person", submittedAt: "2026-10-01T09:00:00+08:00", summary: "Summary", Status: "Open" };
const aggregateRecord = { storeReference: { trtid: "S-1" }, ...valid.coverage.businessPeriod, value: 80 };
const requiredSetBatch = { ...valid, domain: "required-sets", effectiveTime: valid.coverage.businessPeriod };

function expectShapeRejected(batch: unknown, code: string) {
  expect(validateOpenApi(batch)).toBe(false);
  const parsed = parseProductionImportBatch(batch);
  expect(parsed.value).toBeNull();
  expect(parsed.diagnostics.map(({ code }) => code)).toContain(code);
}

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

  it.each([{ records: [] }, { records: [{}] }])("rejects Take Charge annual aggregate batches regardless of record count: %j", ({ records }) => {
    const batch = { ...valid, domain: "take-charge-annual-aggregates", records, expectedRecordCount: records.length, coverage: { ...valid.coverage, proof: { kind: "AUTHORITATIVE_EMPTY", reference: "source:empty", controlRecordCount: 0 } } };
    expectShapeRejected(batch, "DIRECT_REPOSITORY_INTEGRATION_REQUIRED");
    expect(parseProductionImportBatch(batch).diagnostics).toContainEqual(expect.objectContaining({ field: "domain", recordIndex: null, code: "DIRECT_REPOSITORY_INTEGRATION_REQUIRED" }));
  });

  it.each([
    ["events", "eventDate", valid.records[0]],
    ["actions", "submittedDate", actionRecord],
    ["take-charge", "submittedAt", takeChargeRecord],
  ])("rejects null required datetime for %s", (domain, field, row) => {
    expectShapeRejected({ ...valid, domain, records: [{ ...row, [field as string]: null }] }, "INVALID_DATETIME");
  });

  it.each(["startInclusive", "endExclusive"])("rejects invalid Action Closure Rate %s", (field) => {
    for (const invalid of [null, "not-a-date", "2026-10-01"]) {
      expectShapeRejected({ ...valid, domain: "action-closure-rate", records: [{ ...aggregateRecord, [field]: invalid }] }, "INVALID_DATETIME");
    }
  });

  it.each([
    {}, { requiredTrainingItems: null }, { expectedInspectionTasks: "I-1" },
    { requiredTrainingItems: ["T-1"], expectedInspectionTasks: null },
    { expectedInspectionTasks: ["I-1"], requiredTrainingItems: null },
    { requiredTrainingItems: [], expectedInspectionTasks: ["I-1"] },
    { requiredTrainingItems: ["T-1", "T-1"] },
  ])("rejects malformed or mixed required-set properties: %j", (sets) => {
    expectShapeRejected({ ...requiredSetBatch, records: [{ storeReference: { trtid: "S-1" }, month: "2026-10", ...sets }] }, "INVALID_REQUIRED_SET");
  });

  it.each(["scope", "digest"])("rejects blank optional proof %s consistently with OpenAPI", (field) => {
    expectShapeRejected({ ...valid, coverage: { ...valid.coverage, proof: { kind: "EXPORT_MANIFEST", reference: "manifest:1", [field]: " " } } }, "INVALID_COVERAGE");
  });

  it("preserves nullable Action closedDate and valid required-set arrays", () => {
    for (const batch of [
      { ...valid, domain: "actions", records: [actionRecord] },
      { ...valid, domain: "action-closure-rate", records: [aggregateRecord] },
      { ...requiredSetBatch, records: [{ storeReference: { trtid: "S-1" }, month: "2026-10", requiredTrainingItems: ["T-1"] }] },
      { ...requiredSetBatch, records: [{ storeReference: { trtid: "S-1" }, month: "2026-10", expectedInspectionTasks: ["I-1"] }] },
    ]) {
      expect(validateOpenApi(batch)).toBe(true);
      expect(parseProductionImportBatch(batch).value).not.toBeNull();
    }
  });

  it("validates optional English Store Name as text or null", () => {
    const certificate = { TRTID: "S-1", "Certificate Type": "Type", "Expiry Date": null, Person: "Person", "Person Email": "a@b", "Business Title": "Title" };
    const batchWithName = (name: unknown) => ({ ...valid, domain: "certificates", effectiveTime: valid.coverage.businessPeriod, records: [{ ...certificate, "English Store Name": name }] });
    for (const name of [null, "Store One"]) {
      expect(validateOpenApi(batchWithName(name))).toBe(true);
      expect(parseProductionImportBatch(batchWithName(name)).value).not.toBeNull();
    }
    expectShapeRejected(batchWithName(123), "INVALID_TYPE");
    expect(parseProductionImportBatch(batchWithName(123)).diagnostics).toContainEqual(expect.objectContaining({ field: "English Store Name", code: "INVALID_TYPE" }));
  });

  it("compares period endpoint instants independently of key order and timezone spelling", () => {
    for (const businessPeriod of [
      { endExclusive: valid.coverage.businessPeriod.endExclusive, startInclusive: valid.coverage.businessPeriod.startInclusive },
      { startInclusive: "2026-09-30T16:00:00Z", endExclusive: "2026-10-31T16:00:00Z" },
    ]) {
      const batch = { ...valid, businessPeriod };
      expect(validateOpenApi(batch)).toBe(true);
      expect(parseProductionImportBatch(batch).value).not.toBeNull();
    }
    const mismatched = parseProductionImportBatch({ ...valid, businessPeriod: { ...valid.coverage.businessPeriod, startInclusive: "2026-10-02T00:00:00+08:00" } });
    expect(mismatched.diagnostics.map(({ code }) => code)).toContain("COVERAGE_PERIOD_MISMATCH");
    const invalid = parseProductionImportBatch({ ...valid, businessPeriod: { startInclusive: null, endExclusive: null } });
    expect(invalid.diagnostics.map(({ code }) => code)).toContain("INVALID_PERIOD");
    expect(invalid.diagnostics.map(({ code }) => code)).not.toContain("COVERAGE_PERIOD_MISMATCH");
  });

  it.each([
    ["events", "eventDate", valid.records[0]],
    ["actions", "submittedDate", actionRecord],
    ["take-charge", "submittedAt", takeChargeRecord],
  ])("enforces half-open business-time membership for %s", (domain, field, row) => {
    const batchWithTime = (time: string) => ({ ...valid, domain, records: [{ ...row, [field as string]: time }] });
    expect(parseProductionImportBatch(batchWithTime("2026-09-30T16:00:00Z")).value).not.toBeNull();
    expect(parseProductionImportBatch(batchWithTime("2026-10-31T15:59:59.999Z")).value).not.toBeNull();
    for (const time of ["2026-09-30T15:59:59.999Z", "2026-10-31T16:00:00Z"]) {
      expect(parseProductionImportBatch(batchWithTime(time)).diagnostics).toContainEqual(expect.objectContaining({ recordIndex: 0, field, code: "RECORD_OUTSIDE_COVERAGE_PERIOD" }));
    }
  });

  it.each([
    ["training", { trainingName: "T-1", completionRate: 100, incompletePeople: [] }],
    ["drill", { drillName: "D-1", status: "已完成" }],
  ])("requires the entire %s month within coverage", (domain, fields) => {
    const batchWithMonth = (month: string) => ({ ...valid, domain, records: [{ storeReference: { trtid: "S-1" }, ...fields, month }] });
    expect(parseProductionImportBatch(batchWithMonth("2026-10")).value).not.toBeNull();
    for (const month of ["2026-09", "2026-11"]) expect(parseProductionImportBatch(batchWithMonth(month)).diagnostics.map(({ code }) => code)).toContain("RECORD_OUTSIDE_COVERAGE_PERIOD");
    const partialMonth = { ...batchWithMonth("2026-10"), coverage: { ...valid.coverage, businessPeriod: { ...valid.coverage.businessPeriod, endExclusive: "2026-10-15T00:00:00+08:00" } } };
    expect(parseProductionImportBatch(partialMonth).diagnostics.map(({ code }) => code)).toContain("RECORD_OUTSIDE_COVERAGE_PERIOD");
  });

  it("uses Inspection Shanghai dueDate for period membership and retains null dates", () => {
    const batchWithDate = (dueDate: string | null) => ({ ...valid, domain: "inspection", records: [{ inspectionNumber: "I-1", storeReference: { trtid: "S-1" }, inspectionName: "Check", dueDate, inspector: null, status: null }] });
    for (const date of [null, "2026-10-01", "2026-10-31"]) expect(parseProductionImportBatch(batchWithDate(date)).value).not.toBeNull();
    for (const date of ["2026-09-30", "2026-11-01"]) expect(parseProductionImportBatch(batchWithDate(date)).diagnostics.map(({ code }) => code)).toContain("RECORD_OUTSIDE_COVERAGE_PERIOD");
  });

  it("accepts contained source aggregate ranges and rejects ranges crossing coverage", () => {
    for (const range of [valid.coverage.businessPeriod, { startInclusive: "2026-10-02T00:00:00+08:00", endExclusive: "2026-10-03T00:00:00+08:00" }]) {
      expect(parseProductionImportBatch({ ...valid, domain: "action-closure-rate", records: [{ ...aggregateRecord, ...range }] }).value).not.toBeNull();
    }
    for (const range of [
      { ...valid.coverage.businessPeriod, startInclusive: "2026-09-01T00:00:00+08:00" },
      { ...valid.coverage.businessPeriod, endExclusive: "2026-11-02T00:00:00+08:00" },
    ]) expect(parseProductionImportBatch({ ...valid, domain: "action-closure-rate", records: [{ ...aggregateRecord, ...range }] }).diagnostics.map(({ code }) => code)).toContain("RECORD_OUTSIDE_COVERAGE_PERIOD");
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

  it("rejects non-string Store identity fields even when another identity is valid", () => {
    const result = parseProductionImportBatch({
      ...valid,
      records: [{ ...valid.records[0], storeReference: { trtid: 123, storeNameEn: "Store One" } }],
    });
    expect(result.diagnostics.map(({ code }) => code)).toContain("INVALID_STORE_REFERENCE");
  });

  it("rejects non-primitive Take Charge extra fields", () => {
    const result = parseProductionImportBatch({
      ...valid,
      domain: "take-charge",
      records: [{
        storeReference: { trtid: "S-1" }, tchId: "T-1", submittedBy: "Person",
        submittedAt: "2026-10-01T09:00:00+08:00", summary: "Summary", Status: "Open",
        extraFields: { unsafe: { nested: true } },
      }],
    });
    expect(result.diagnostics.map(({ code }) => code)).toContain("INVALID_OBJECT");
  });
});
