import { STORE_FIELD_DEFINITIONS } from "@/data/contracts/store-fields";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { areaScopeId } from "@/data/contracts/kpi";
import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { mockStores } from "@/data/mock/stores";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");

function context(
  startMonth = "2026-07" as const,
  endMonth = "2026-09" as const,
): EhsFilterContext {
  return {
    region: { kind: "ALL" },
    area: { kind: "ALL" },
    store: { kind: "ALL" },
    period: periodFromMonthRange(startMonth, endMonth)!,
  };
}

describe("scoped Stores repository query", () => {
  it("returns the normalized Store Master fields", async () => {
    const result = await createMockEhsRepository(referenceDate).getStores({
      context: context(),
    });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items).toHaveLength(mockStores.length);
    expect(result.items[0]).toEqual({
      storeId: mockStores[0].trtid,
      storeNameCn: mockStores[0].storeNameCn,
      storeNameEn: mockStores[0].storeNameEn,
      trtid: mockStores[0].trtid,
      region: mockStores[0].region,
      area: mockStores[0].area,
      regionOwner: mockStores[0].regionOwner,
      regionOwnerEmail: mockStores[0].regionOwnerEmail,
      areaOwner: mockStores[0].areaOwner,
      areaOwnerEmail: mockStores[0].areaOwnerEmail,
      manager: mockStores[0].manager,
      managerEmail: mockStores[0].managerEmail,
      ehsAmbassador: mockStores[0].ehsAmbassador,
      ehsAmbassadorEmail: mockStores[0].ehsAmbassadorEmail,
    });
  });

  it("applies Region, Area and canonical Store scopes together", async () => {
    const selected = mockStores[1];
    const result = await createMockEhsRepository(referenceDate).getStores({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: [selected.region] },
        area: { kind: "INCLUDE", values: [areaScopeId(selected.region, selected.area)] },
        store: {
          kind: "INCLUDE",
          values: [mockStores[0].trtid, selected.trtid],
        },
      },
    });

    expect(result.items.map(({ storeId }) => storeId)).toEqual([
      mockStores[0].trtid,
      selected.trtid,
    ]);
  });

  it("supports independent Region, Area and multi-Store scopes", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const base = context();
    const region = await repository.getStores({
      context: {
        ...base,
        region: { kind: "INCLUDE", values: [mockStores[0].region] },
      },
    });
    const area = await repository.getStores({
      context: {
        ...base,
        area: { kind: "INCLUDE", values: [areaScopeId(mockStores[0].region, mockStores[0].area)] },
      },
    });
    const store = await repository.getStores({
      context: {
        ...base,
        store: {
          kind: "INCLUDE",
          values: [mockStores[0].trtid, mockStores[3].trtid],
        },
      },
    });

    expect(region.items).toHaveLength(mockStores.filter(({ region }) => region === mockStores[0].region).length);
    expect(area.items).toHaveLength(mockStores.filter(({ area }) => area === mockStores[0].area).length);
    expect(store.items.map(({ storeId }) => storeId)).toEqual([
      mockStores[0].trtid,
      mockStores[3].trtid,
    ]);
  });

  it("ignores Period for Store Master data", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const scoped = {
      ...context(),
      region: { kind: "INCLUDE", values: [mockStores[0].region] },
    } satisfies EhsFilterContext;
    const quarter = await repository.getStores({ context: scoped });
    const otherPeriod = { ...scoped, period: periodFromMonthRange("2026-09", "2026-09")! };
    const month = await repository.getStores({ context: otherPeriod });

    expect(month).toEqual(quarter);
  });

  it("returns a confirmed empty result for a valid scope with no stores", async () => {
    const result = await createMockEhsRepository(referenceDate).getStores({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: ["不存在的区域"] },
      },
    });

    expect(result).toEqual({ availability: "CONFIRMED_EMPTY", items: [], fieldDefinitions: STORE_FIELD_DEFINITIONS });
  });
});


it("keeps identical Area names in different Regions separate with Region ALL", async () => {
  const original = createKpiMockData(referenceDate);
  const dataset = { ...original, stores: [
    { ...original.stores[0], region: "东区", area: "一部" },
    { ...original.stores[1], region: "西区", area: "一部" },
  ] };
  const repository = createMockEhsRepository(referenceDate, { dataset });
  const selected = await repository.getStores({ context: { ...context(), area: { kind: "INCLUDE", values: [areaScopeId("东区", "一部")] } } });
  expect(selected.items.map((store) => store.storeId)).toEqual([original.stores[0].trtid]);
  const ambiguous = await repository.getStores({ context: { ...context(), area: { kind: "INCLUDE", values: ["一部"] } } });
  expect(ambiguous.items).toEqual([]);
});


it("returns source extension columns only from the selected Store scope", async () => {
  const original = createKpiMockData(referenceDate);
  const dataset: typeof original = { ...original, stores: [
    { ...original.stores[0], extraFields: { 门店性质: "直营", 停车位: 8, 有停车场: false, 地址: null } },
    { ...original.stores[1], extraFields: { 不在授权查询范围的字段: "不可见" } },
  ] };
  const repository = createMockEhsRepository(referenceDate, { dataset });
  const result = await repository.getStores({ context: { ...context(), store: { kind: "INCLUDE", values: [original.stores[0].trtid] } } });
  expect(result.items[0]?.extraFields).toEqual(dataset.stores[0].extraFields);
  expect(result.fieldDefinitions?.filter((field) => field.source === "extra").map((field) => field.key)).toEqual(["门店性质", "停车位", "有停车场", "地址"]);
  expect(result.fieldDefinitions?.some((field) => field.key === "不在授权查询范围的字段")).toBe(false);
});
