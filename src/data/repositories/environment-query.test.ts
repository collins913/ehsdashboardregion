import { describe, expect, it } from "vitest";
import { createMockEhsRepository } from "./mock-ehs-repository";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createEnvironmentMockRecords } from "@/data/mock/environment-v1";
import { resolveStoreReference } from "@/data/resolve-store-reference";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { RawEnvironmentRecord } from "@/types/ehs";

const referenceDate = new Date("2026-09-15T00:00:00+08:00");
const dataset = createKpiMockData(referenceDate);
const raw = createEnvironmentMockRecords(dataset.stores);
const context: EhsFilterContext = {
  region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

describe("Environment V1 query", () => {
  it("uses deterministic source-like fields and only the three allowed values", () => {
    expect(dataset.environmentRecords).toEqual(raw);
    expect(raw).toEqual(createEnvironmentMockRecords(dataset.stores));
    expect(raw).toHaveLength(12);
    expect(Object.keys(raw[0])).toEqual(["TRTID", "English Store Name", "环境影响评价", "排污许可", "排水许可", "环境预案", "监测", "废弃物合同"]);
    for (const key of ["环境影响评价", "排污许可", "排水许可", "环境预案", "监测", "废弃物合同"] as const) {
      expect(new Set(raw.map((record) => record[key]))).toEqual(new Set(["有", "无", "不适用"]));
    }
  });

  it("reads Environment records from the existing dataset without generating them in Repository", async () => {
    const supplied = { ...dataset, environmentRecords: [{ ...raw[0], 废弃物合同: "有" as const }] };
    const result = await createMockEhsRepository(referenceDate, { dataset: supplied }).getEnvironment({ context });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.wasteContract).toBe("有");
  });

  it("returns canonical identity from Global Filters and Chinese name from Store Master", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const result = await repository.getEnvironment({ context });
    const stores = await repository.getFilterStores();
    expect(result.availability).toBe("AVAILABLE");
    for (const record of result.items) {
      expect(stores.find((store) => store.storeId === record.storeId)?.displayName).toBe(record.storeDisplayName);
      expect(Object.keys(record)).toEqual(["storeId", "storeDisplayName", "environmentalImpactAssessment", "dischargePermit", "drainagePermit", "emergencyPlan", "monitoring", "wasteContract"]);
      expect(record.wasteContract).toBe(raw.find((source) => source.TRTID === record.storeId)?.废弃物合同);
    }
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

  it("does not turn missing or invalid source values into 无", async () => {
    const missing = await createMockEhsRepository(referenceDate, { environmentRecords: [] }).getEnvironment({ context });
    expect(missing).toEqual({ availability: "INCOMPLETE", items: [] });
    const invalid = { ...raw[0], 监测: "UNKNOWN" } as unknown as RawEnvironmentRecord;
    expect(await createMockEhsRepository(referenceDate, { environmentRecords: [invalid] }).getEnvironment({ context })).toEqual(missing);
  });
});
