import { describe, expect, it } from "vitest";
import type { KpiStore } from "@/data/contracts/kpi";
import { filterStoresByDisplayName } from "@/components/shared/global-filters";
import {
  createInitialGlobalFilterState,
  toKpiFilterContext,
} from "@/features/global-filters/global-filter-state";

const stores = [
  {
    storeId: "hidden-keyword",
    displayName: "云桥门店",
    region: "北部区域",
    area: "北部小区",
  },
  {
    storeId: "store-002",
    displayName: "海湾旗舰店",
    region: "南部区域",
    area: "南部小区",
  },
] satisfies readonly KpiStore[];

describe("Store display-name search", () => {
  it("matches displayName only", () => {
    expect(filterStoresByDisplayName(stores, "云桥")).toEqual([stores[0]]);
    expect(filterStoresByDisplayName(stores, "旗舰")).toEqual([stores[1]]);
    expect(filterStoresByDisplayName(stores, "hidden-keyword")).toEqual([]);
    expect(filterStoresByDisplayName(stores, "南部区域")).toEqual([]);
  });

  it("restores the complete candidate list when the keyword is blank", () => {
    expect(filterStoresByDisplayName(stores, "  ")).toBe(stores);
  });

  it("filters only within the Region and Area scoped candidates supplied to it", () => {
    const scopedStores = [stores[0]];

    expect(filterStoresByDisplayName(scopedStores, "门店")).toEqual([
      stores[0],
    ]);
    expect(filterStoresByDisplayName(scopedStores, "海湾")).toEqual([]);
  });

  it("does not change selected storeIds or enter KpiFilterContext", () => {
    const state = {
      ...createInitialGlobalFilterState(),
      store: {
        kind: "INCLUDE" as const,
        values: ["hidden-keyword"] as const,
      },
    };

    filterStoresByDisplayName(stores, "不存在");

    expect(state.store.values).toEqual(["hidden-keyword"]);
    expect(
      toKpiFilterContext(
        state,
        new Date("2026-09-11T00:00:00.000Z"),
        stores,
      )?.store,
    ).toEqual(state.store);
  });
});
