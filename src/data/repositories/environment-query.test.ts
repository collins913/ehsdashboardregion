import { describe, expect, it } from "vitest";
import { createMockEhsRepository } from "./mock-ehs-repository";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createEnvironmentMockRecords } from "@/data/mock/environment-v1";
import { resolveStoreReference } from "@/data/resolve-store-reference";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { RawEnvironmentRecord, RawEnvironmentWasteContract } from "@/types/ehs";

const referenceDate = new Date("2026-09-15T00:00:00+08:00");
const dataset = createKpiMockData(referenceDate);
const raw = createEnvironmentMockRecords(dataset.stores);
const context: EhsFilterContext = {
  region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

describe("Environment detail query", () => {
  it("creates deterministic source-like detail records for the existing Standard coverage", () => {
    expect(dataset.environmentRecords).toEqual(raw);
    expect(raw).toEqual(createEnvironmentMockRecords(dataset.stores));
    expect(raw).toHaveLength(12);
    expect(Object.keys(raw[0])).toEqual([
      "TRTID", "English Store Name", "环境影响评价", "排污许可", "排水许可", "环境预案", "监测", "废弃物合同",
    ]);
    expect(new Set(raw.map((record) => record.监测))).toEqual(new Set(["有", "无", "不适用"]));
    expect(raw.some((record) => record.环境影响评价.总量要求["气-颗粒物"] === null)).toBe(true);
    expect(raw.some((record) => record.废弃物合同.危险废物处置合同.length > 1)).toBe(true);
    expect(new Set(raw.map((record) => record.废弃物合同.危险废物处置合同.length))).toEqual(new Set([1, 2, 3]));
    expect(new Set(raw.map((record) => record.废弃物合同.一般工业固体废物处置合同.length))).toEqual(new Set([1, 2, 3]));
    const hazardousContracts = raw.map((record) => record.废弃物合同.危险废物处置合同);
    const solidContracts = raw.map((record) => record.废弃物合同.一般工业固体废物处置合同);
    for (const contractsByStore of [hazardousContracts, solidContracts]) {
      expect(contractsByStore.every((contracts) => contracts.length > 0)).toBe(true);
      expect(contractsByStore.some((contracts) => contracts.some(({ 有效期止 }) => 有效期止 === null))).toBe(true);
      expect(contractsByStore.some((contracts) => contracts.some(({ 有效期止 }) => 有效期止 !== null && 有效期止 < "2026-09-15"))).toBe(true);
      expect(contractsByStore.some((contracts) => contracts.some(({ 有效期止 }) => 有效期止 !== null && 有效期止 >= "2026-09-15"))).toBe(true);
    }
  });

  it("preserves unrestricted detail text without status inference", async () => {
    const source: RawEnvironmentRecord = {
      ...raw[0]!,
      环境影响评价: { ...raw[0]!.环境影响评价, 环境影响评价: "任意环评说明文本" },
      排污许可: { ...raw[0]!.排污许可, 排污许可: "任意排污许可说明", 执行报告: "自定义报告节奏" },
      排水许可: { ...raw[0]!.排水许可, 洗车: "仅部分工位适用", 排水许可: "属地补充说明" },
      环境预案: { ...raw[0]!.环境预案, 突发环境事件应急预案备案情况: "备案办理情况说明" },
    };
    const result = await createMockEhsRepository(referenceDate, { environmentRecords: [source] }).getEnvironment({ context });
    const normalized = result.items[0]!;
    expect(normalized.environmentalLicenses.environmentalImpactAssessment.assessmentText).toBe("任意环评说明文本");
    expect(normalized.environmentalLicenses.dischargePermit).toMatchObject({ permitText: "任意排污许可说明", executionReport: "自定义报告节奏" });
    expect(normalized.environmentalLicenses.drainagePermit).toMatchObject({ carWash: "仅部分工位适用", drainagePermitText: "属地补充说明" });
    expect(normalized.emergencyPlan.filingStatus).toBe("备案办理情况说明");
  });

  it("normalizes explicit fields and canonical Store identity through the existing Repository", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const result = await repository.getEnvironment({ context });
    const stores = await repository.getFilterStores();
    const first = result.items[0]!;
    const source = raw[0]!;

    expect(result.availability).toBe("AVAILABLE");
    expect(stores.find((store) => store.storeId === first.storeId)?.displayName).toBe(first.storeDisplayName);
    expect(first.facilityInformation).toBeNull();
    expect(first.environmentalLicenses.environmentalImpactAssessment.assessmentText).toBe(source.环境影响评价.环境影响评价);
    expect(first.environmentalLicenses.environmentalImpactAssessment.totalRequirements.airVocs).toBe(source.环境影响评价.总量要求["气-VOCs"]);
    expect(first.environmentalLicenses.dischargePermit.executionReport).toBe(source.排污许可.执行报告);
    expect(first.environmentalLicenses.drainagePermit.carWash).toBe(source.排水许可.洗车);
    expect(first.emergencyPlan).toEqual({
      filingStatus: source.环境预案.突发环境事件应急预案备案情况,
      filingNumber: source.环境预案.备案编号,
      validFrom: source.环境预案.有效期起,
      validTo: source.环境预案.有效期止,
      remarks: source.环境预案.备注,
    });
    expect(first.monitoring).toEqual({ monitoringText: source.监测 });
  });

  it("preserves every waste contract in source order without dedupe or limit", async () => {
    const duplicate: RawEnvironmentWasteContract = {
      供应商名称: "重复供应商", 种类: "废活性炭", 有效期起: "2026-01-01", 有效期止: "2027-01-01",
    };
    const contracts: readonly RawEnvironmentWasteContract[] = Array.from({ length: 8 }, (_, index) => index < 2 ? duplicate : {
      供应商名称: `供应商 ${index}`, 种类: `种类 ${index}`, 有效期起: null, 有效期止: null,
    });
    const source: RawEnvironmentRecord = {
      ...raw[0],
      废弃物合同: { 危险废物处置合同: contracts, 一般工业固体废物处置合同: [duplicate] },
    };
    const result = await createMockEhsRepository(referenceDate, { environmentRecords: [source] }).getEnvironment({ context });

    expect(result.items[0]!.wasteContracts.hazardousWaste).toHaveLength(8);
    expect(result.items[0]!.wasteContracts.hazardousWaste.slice(0, 2)).toEqual([
      { supplierName: "重复供应商", wasteType: "废活性炭", validFrom: "2026-01-01", validTo: "2027-01-01" },
      { supplierName: "重复供应商", wasteType: "废活性炭", validFrom: "2026-01-01", validTo: "2027-01-01" },
    ]);
    expect(result.items[0]!.wasteContracts.generalIndustrialSolidWaste).toHaveLength(1);
  });

  it.each([
    ["region", "南屿区"], ["area", "西岭二部"], ["store", "TEST-002"],
  ] as const)("filters by %s using canonical Store scope", async (scope, value) => {
    const repository = createMockEhsRepository(referenceDate);
    const result = await repository.getEnvironment({ context: { ...context, [scope]: { kind: "INCLUDE", values: [value] } } });
    const expected = dataset.stores.filter((store) => (scope === "store" ? store.trtid : store[scope]) === value);
    expect(result.items.map((record) => record.storeDisplayName)).toEqual(expected.map((store) => store.storeNameCn));
    expect(result.availability).toBe("AVAILABLE");
  });

  it("ignores Period, including unsupported months", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const otherPeriod = { ...context, period: periodFromMonthRange("2030-01", "2030-02")! };
    expect(await repository.getEnvironment({ context: otherPeriod })).toEqual(await repository.getEnvironment({ context }));
  });

  it.each([
    ["unique TRTID and historical English name", "TEST-001", "Historical Name", "RESOLVED"],
    ["invalid TRTID and unique English fallback", "old-source-id", dataset.stores[1].storeNameEn, "RESOLVED"],
    ["conflicting references", "TEST-001", dataset.stores[1].storeNameEn, "CONFLICT"],
    ["unresolved references", "missing", "missing", "UNRESOLVED"],
  ])("preserves existing resolver semantics: %s", async (_, trtid, name, kind) => {
    const source: RawEnvironmentRecord = { ...raw[0], TRTID: trtid, "English Store Name": name };
    const resolution = resolveStoreReference({ trtid, storeNameEn: name }, dataset.stores);
    expect(resolution.kind).toBe(kind);
    const result = await createMockEhsRepository(referenceDate, { environmentRecords: [source] }).getEnvironment({ context });
    if (resolution.kind === "RESOLVED") {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.storeDisplayName).toBe(resolution.store.storeNameCn);
      if (trtid === "old-source-id") expect(result.items[0]?.storeId).not.toBe(trtid);
    } else {
      expect(result.items).toEqual([]);
      expect(result.availability).toBe("INCOMPLETE");
    }
  });

  it("does not turn missing or invalid monitoring into a business result", async () => {
    const missing = await createMockEhsRepository(referenceDate, { environmentRecords: [] }).getEnvironment({ context });
    expect(missing).toEqual({ availability: "INCOMPLETE", items: [] });
    const invalid = { ...raw[0], 监测: "UNKNOWN" } as unknown as RawEnvironmentRecord;
    expect(await createMockEhsRepository(referenceDate, { environmentRecords: [invalid] }).getEnvironment({ context })).toEqual(missing);
  });
});
