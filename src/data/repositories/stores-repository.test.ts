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
      manager: mockStores[0].manager,
      ehsAmbassador: mockStores[0].ehsAmbassador,
    });
  });

  it("applies Region, Area and canonical Store scopes together", async () => {
    const selected = mockStores[1];
    const result = await createMockEhsRepository(referenceDate).getStores({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: [selected.region] },
        area: { kind: "INCLUDE", values: [selected.area] },
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
        area: { kind: "INCLUDE", values: [mockStores[0].area] },
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

    expect(region.items).toHaveLength(4);
    expect(area.items).toHaveLength(2);
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
    const month = await repository.getStores({
      context: { ...scoped, period: periodFromMonthRange("2026-09", "2026-09")! },
    });

    expect(month).toEqual(quarter);
  });

  it("returns a confirmed empty result for a valid scope with no stores", async () => {
    const result = await createMockEhsRepository(referenceDate).getStores({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: ["不存在的区域"] },
      },
    });

    expect(result).toEqual({ availability: "CONFIRMED_EMPTY", items: [] });
  });
});
