import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routes } from "@/config/navigation";
import type { EhsFilterContext, KpiStore } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { Month, StoreId } from "@/types/ehs";
import { OVERVIEW_V1_METRIC_CATALOG, createScoreContribution, missingSourceContribution } from "@/lib/rules/overview-scoring";
import { prepareOverviewResult } from "@/features/overview/prepare-overview-result";
import { ManagementSummary } from "@/features/overview/components/management-summary";
import { OVERVIEW_SCORE_DOMAIN, selectOverviewAttentionPoint } from "@/features/overview/components/overview-charts";

const stores: readonly KpiStore[] = [
  { storeId: "store-a" as StoreId, displayName: "甲门店", region: "东区", area: "甲小区" },
  { storeId: "store-b" as StoreId, displayName: "乙门店", region: "东区", area: "甲小区" },
];
const months = ["2026-01", "2026-02", "2026-03", "2026-04"] as Month[];
const period = periodFromMonthRange("2026-03" as Month, "2026-04" as Month)!;
const scope = { region: { kind: "ALL" as const }, area: { kind: "ALL" as const }, store: { kind: "ALL" as const } };
const context: EhsFilterContext = { ...scope, period };

function contributions() {
  return stores.flatMap((store) => months.flatMap((month) => OVERVIEW_V1_METRIC_CATALOG.map((metric) => {
    const identity = { ...metric, storeId: store.storeId, month, referenceDate: `${month}-28` };
    return store.storeId === "store-a" ? createScoreContribution(identity, true) : missingSourceContribution(identity);
  })));
}

const result = prepareOverviewResult({ referenceMonth: "2026-04" as Month, stores, selectedStores: stores, attentionStores: stores, contributions: contributions(), context, requestedScope: scope, availableMonths: months, sourceAvailability: "AVAILABLE" });

describe("formal Overview V1", () => {
  it("renders the formal data result without Prototype output", () => {
    expect(routes.overview).toMatchObject({ href: "/overview" });
    const markup = renderToStaticMarkup(createElement(TooltipProvider, null, createElement(ManagementSummary, { hero: result.hero, comparisonLabel: `比较期：${result.previousPeriodLabel}` })));
    expect(markup).toContain("综合得分率");
    expect(markup).toContain("小区变化排名");
    expect(markup).toContain("门店变化排名");
    expect(markup).not.toContain("Prototype 数据");
    expect(markup).not.toContain("MISSING 不计入分母");
  });

  it("keeps the V1 denominator fixed at 12 per Store × Month and pools points", () => {
    expect(result.comparisons).toHaveLength(2);
    expect(result.comparisons[0]).toMatchObject({ earnedPoints: 12, totalPoints: 12, score: 100 });
    expect(result.dimensionScores.reduce((sum, dimension) => sum + dimension.totalPoints, 0)).toBe(24);
    expect(result.scopeDetails).toHaveLength(3);
    expect(result.hero.monthlyScoreHistory).toHaveLength(4);
    expect(result.hero.monthlyScoreHistory.map((point) => point.periodLabel)).toEqual(months);
    expect(result.hero.monthlyScoreHistory.map((point) => point.score)).toEqual([50, 50, 50, 50]);
  });

  it("keeps all stores ranked and gives ties a deterministic order", () => {
    expect(result.comparisons.map((row) => row.id)).toEqual(["store-a", "store-b"]);
    expect(result.comparisons.map((row) => row.rank)).toEqual([1, 2]);
    expect(result.hero.improvingRanking.stores.map((row) => row.scopeId)).toEqual(["store-a", "store-b"]);
    expect(result.hero.decliningRanking.stores).toEqual([]);
    expect(result.attentionMatrix.groups.map((group) => group.id)).toEqual(["东区:甲小区"]);
    expect(result.scopeDetails.find((detail) => detail.level === "AREA")?.score).toBe(50);
  });

  it("keeps the store list scoped while the single-store matrix shows its authorized area peers", () => {
    const requestedScope = { ...scope, store: { kind: "INCLUDE" as const, values: [stores[0].storeId] as [StoreId] } };
    const selectedContext: EhsFilterContext = { ...context, store: requestedScope.store };
    const selected = prepareOverviewResult({ referenceMonth: "2026-04" as Month,
      stores,
      selectedStores: [stores[0]],
      attentionStores: stores,
      contributions: contributions(),
      context: selectedContext,
      requestedScope,
      availableMonths: months,
      sourceAvailability: "AVAILABLE",
    });

    expect(selected.stores.map((store) => store.storeId)).toEqual([stores[0].storeId]);
    expect(selected.comparisons.map((row) => row.id)).toEqual([stores[0].storeId]);
    expect(selected.attentionMatrix.groups.flatMap((group) => group.members.map((member) => member.id))).toEqual(stores.map((store) => store.storeId));
    expect(selected.scopeDetails.some((detail) => detail.id === stores[1].storeId)).toBe(true);
  });

  it("selects a matrix member without deriving any domain data in the chart", () => {
    const selected: string[] = [];
    selectOverviewAttentionPoint({ payload: { id: "store-a" } }, (id) => selected.push(id));
    expect(selected).toEqual(["store-a"]);
    expect(OVERVIEW_SCORE_DOMAIN).toEqual([0, 100]);
  });
});
