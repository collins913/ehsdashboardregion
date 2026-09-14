import { describe, expect, it, vi } from "vitest";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { loadStoresPageData } from "@/features/stores/stores-page-content";

const context: KpiFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

describe("Stores page data binding", () => {
  it("passes the shared Filter Context directly to Repository", () => {
    const getStores = vi.fn(() => ({
      availability: "CONFIRMED_EMPTY" as const,
      items: [] as const,
    }));

    expect(loadStoresPageData(context, { getStores })).toEqual({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
    expect(getStores).toHaveBeenCalledWith({ context });
  });

  it("does not query Repository when Global Filter Context is invalid", () => {
    const getStores = vi.fn();

    expect(loadStoresPageData(null, { getStores })).toBeNull();
    expect(getStores).not.toHaveBeenCalled();
  });
});
