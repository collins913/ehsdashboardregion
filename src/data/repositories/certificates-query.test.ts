import { describe, expect, it } from "vitest";
import { createMockEhsRepository } from "./mock-ehs-repository";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createMockCertificateRecords } from "@/data/mock/certificates";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { RawCertificateRecord } from "@/types/ehs";
import { CERTIFICATE_TYPE_CATEGORIES } from "@/lib/rules/certificate-types";
import { buildCertificateOverview, CERTIFICATE_REQUIREMENTS } from "@/lib/rules/certificate-requirements";

const reference = new Date("2026-09-14T16:00:00Z");
const dataset = createKpiMockData(reference);
const context: EhsFilterContext = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" }, period: periodFromMonthRange("2026-07", "2026-09")! };
const raw: RawCertificateRecord = { TRTID: dataset.stores[0].trtid, "English Store Name": dataset.stores[0].storeNameEn,
  "Certificate Type": "主要负责人安全生产培训合格证书-S", "Expiry Date": "2026-09-20",
  Person: "测试人员", "Person Email": "person@example.test", "Business Title": "无关岗位" };
const repository = (records: readonly RawCertificateRecord[]) => createMockEhsRepository(reference, { certificateRecords: records });

describe("Certificates V1 Repository", () => {
  it("uses deterministic source-like records from the same Dataset", () => {
    expect(dataset.certificateRecords).toEqual(createMockCertificateRecords(dataset.stores, reference));
    expect(Object.keys(dataset.certificateRecords[0])).toEqual(["TRTID", "English Store Name", "Certificate Type", "Expiry Date", "Person", "Person Email", "Business Title"]);
    const types = new Set(dataset.certificateRecords.map((record) => record["Certificate Type"]));
    for (const type of Object.keys(CERTIFICATE_TYPE_CATEGORIES)) expect(types.has(type)).toBe(true);
    expect(types.has("未来待定义证件")).toBe(true);
    const dates = dataset.certificateRecords.map((record) => record["Expiry Date"]);
    expect(dates).toContain(null); expect(dates).toContain("invalid-date"); expect(dates).toContain("2026-09-15");
  });
  it("returns one canonical Chinese Store row, four categories and typed details", async () => {
    const result = await repository([raw]).getCertificates({ context });
    const store = result.items.find((item) => item.storeId === dataset.stores[0].trtid)!;
    expect(store.storeDisplayName).toBe(dataset.stores[0].storeNameCn);
    expect(store.categories).toHaveLength(4);
    const category = store.categories[0];
    expect(category.status).toBe("NORMAL"); // no M/H1/H2 required
    expect(category.records[0]).toEqual({
      storeId: store.storeId, storeDisplayName: store.storeDisplayName, certificateCategory: "安全健康", certificateType: raw["Certificate Type"],
      person: raw.Person, personEmail: raw["Person Email"], businessTitle: raw["Business Title"], expiryDate: "2026-09-20",
      daysUntilExpiry: 5, certificateStatus: "NORMAL", certificateReason: "NORMAL",
    });
    expect(store.categories.slice(1).every((item) => item.status === "ABNORMAL" && item.records.length === 0)).toBe(true);
  });
  it("isolates unknown Types without guessing from Business Title", async () => {
    const result = await repository([raw, { ...raw, "Certificate Type": "Unknown", "Business Title": "急救员", "Expiry Date": null }]).getCertificates({ context });
    expect(result.unknownTypeRecords[0]?.certificateType).toBe("Unknown");
    expect(result.unknownTypeRecords[0]?.certificateCategory).toBeNull();
    expect(result.items[0]?.categories[0].status).toBe("NORMAL");
    expect(result.items[0]?.categories[1].records).toEqual([]);
  });
  it.each([
    [[], "ABNORMAL"],
    [["2026-09-20"], "NORMAL"],
    [["2026-09-15", "2026-09-20"], "NORMAL"],
    [["2026-09-20", "2026-09-14"], "ABNORMAL"],
    [["2026-09-20", null], "ABNORMAL"],
    [["2026-09-20", "invalid"], "ABNORMAL"],
  ] as const)("summarizes uploaded category records %j without Type completeness", async (expiries, status) => {
    const result = await repository(expiries.map((expiry) => ({ ...raw, "Expiry Date": expiry }))).getCertificates({ context });
    expect(result.items[0]?.categories[0].status).toBe(status);
    expect(result.items[0]?.categories[0].records).toHaveLength(expiries.length);
  });
  it.each([
    ["TRTID primary / historical name", raw.TRTID, "Historical English", 0, "AVAILABLE"],
    ["English fallback", "obsolete-source-id", dataset.stores[1].storeNameEn, 1, "AVAILABLE"],
    ["conflict", raw.TRTID, dataset.stores[1].storeNameEn, null, "INCOMPLETE"],
    ["unresolved", "missing", "missing", null, "INCOMPLETE"],
  ] as const)("reuses resolver: %s", async (_, trtid, name, index, availability) => {
    const result = await repository([{ ...raw, TRTID: trtid, "English Store Name": name }]).getCertificates({ context });
    expect(result.availability).toBe(availability);
    const records = result.items.flatMap((item) => item.categories.flatMap((category) => category.records));
    if (index === null) expect(records).toEqual([]);
    else {
      expect(records[0]?.storeDisplayName).toBe(dataset.stores[index].storeNameCn);
      if (trtid === "obsolete-source-id") expect(records[0]?.storeId).not.toBe(trtid);
    }
  });
  it("does not resolve duplicate Store references arbitrarily", async () => {
    const duplicateDataset = { ...dataset, stores: [...dataset.stores, dataset.stores[0]], certificateRecords: [raw] };
    const result = await createMockEhsRepository(reference, { dataset: duplicateDataset }).getCertificates({ context });
    expect(result.availability).toBe("INCOMPLETE");
    expect(result.items.flatMap((item) => item.categories.flatMap((category) => category.records))).toEqual([]);
  });
  it("keeps the complete Store Master denominator when certificate records are INCOMPLETE", async () => {
    const result = await repository([{ ...raw, TRTID: "missing-store", "English Store Name": "missing-store" }]).getCertificates({ context });
    expect(result.availability).toBe("INCOMPLETE");
    expect(result.items.map((item) => item.storeId)).toEqual(dataset.stores.map((store) => store.trtid));
    const overview = buildCertificateOverview(result);
    const configuredType = Object.keys(CERTIFICATE_REQUIREMENTS)[0];
    expect(overview.items.find((item) => item.certificateType === configuredType)?.requiredCount)
      .toBe(dataset.stores.length * CERTIFICATE_REQUIREMENTS[configuredType]);
  });
  it.each([["region", dataset.stores[0].region], ["area", dataset.stores[0].area], ["store", dataset.stores[0].trtid]] as const)("filters %s", async (scope, value) => {
    const result = await createMockEhsRepository(reference).getCertificates({ context: { ...context, [scope]: { kind: "INCLUDE", values: [value] } } });
    const expected = dataset.stores.filter((store) => (scope === "store" ? store.trtid : store[scope]) === value);
    expect(result.items.map((item) => item.storeDisplayName)).toEqual(expected.map((store) => store.storeNameCn));
  });
  it("ignores Period but evaluates the Shanghai Dashboard reference day", async () => {
    const repo = repository([{ ...raw, "Expiry Date": "2026-09-15" }]);
    const result = await repo.getCertificates({ context });
    expect(result.items[0]?.categories[0].records[0]?.daysUntilExpiry).toBe(0);
    const otherPeriod = { ...context, period: periodFromMonthRange("2030-01", "2030-02")! };
    expect(await repo.getCertificates({ context: otherPeriod })).toEqual(result);
  });
});
