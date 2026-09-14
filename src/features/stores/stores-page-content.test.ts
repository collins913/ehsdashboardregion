import { describe, expect, it, vi } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { loadStoresPageData } from "@/features/stores/stores-page-content";

const context: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

describe("Stores page data binding", () => {
  it("passes the shared Filter Context directly to the server query", async () => {
    const queryStores = vi.fn(async () => ({
      availability: "CONFIRMED_EMPTY" as const,
      items: [] as const,
    }));

    expect(await loadStoresPageData(context, "2026-09-11T00:00:00+08:00", queryStores)).toEqual({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
    expect(queryStores).toHaveBeenCalledWith({
      referenceDateIso: "2026-09-11T00:00:00+08:00",
      query: context,
    });
  });

  it("does not query when Global Filter Context is invalid", async () => {
    const queryStores = vi.fn();

    expect(await loadStoresPageData(null, "2026-09-11T00:00:00+08:00", queryStores)).toBeNull();
    expect(queryStores).not.toHaveBeenCalled();
  });
});
