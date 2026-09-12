import { describe, expect, it, vi } from "vitest";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { loadActionsPageData } from "./actions-page-content";

const context: KpiFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-09", "2026-09")!,
};

describe("Actions page data binding", () => {
  it("passes the shared Filter Context and local view mode to Repository", () => {
    const getActions = vi.fn(() => ({
      availability: "CONFIRMED_EMPTY" as const,
      items: [] as const,
    }));

    expect(loadActionsPageData(context, "OPEN_ONLY", { getActions })).toEqual({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
    expect(getActions).toHaveBeenCalledWith({
      context,
      viewMode: "OPEN_ONLY",
    });
  });

  it("does not query Repository when Global Filter Context is invalid", () => {
    const getActions = vi.fn();

    expect(loadActionsPageData(null, "ALL", { getActions })).toBeNull();
    expect(getActions).not.toHaveBeenCalled();
  });
});
