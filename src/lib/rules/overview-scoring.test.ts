import { describe, expect, it } from "vitest";
import { buildOverviewScoreContributions, overviewObservationKey, OVERVIEW_V1_METRIC_CATALOG } from "./overview-scoring";
import type { KpiStore } from "@/data/contracts/kpi";

const stores = [
  { storeId: "s-1", displayName: "门店 1", area: "小区 1", region: "区域 1" },
  { storeId: "s-2", displayName: "门店 2", area: "小区 1", region: "区域 1" },
] as const satisfies readonly KpiStore[];
const months = ["2026-01", "2026-02"] as const;

describe("Overview V1 contribution contract", () => {
  it("emits exactly one contribution for each Store × metric × month, with 12 available points per Store × Month", () => {
    const contributions = buildOverviewScoreContributions(stores, months, (month) => `${month}-28`, new Map());
    expect(OVERVIEW_V1_METRIC_CATALOG).toHaveLength(12);
    expect(contributions).toHaveLength(stores.length * months.length * 12);
    for (const store of stores) for (const month of months) {
      const group = contributions.filter((item) => item.storeId === store.storeId && item.month === month);
      expect(new Set(group.map((item) => item.metricId)).size).toBe(12);
      expect(group.reduce((sum, item) => sum + item.availablePoints, 0)).toBe(12);
      expect(group.every((item) => item.earnedPoints === 0 && item.reason === "SOURCE_MISSING")).toBe(true);
    }
  });

  it("keeps invalid, incomplete and unconfigured sources in the denominator with distinct reasons", () => {
    const store = stores[0];
    const month = months[0];
    const observations = new Map([
      [overviewObservationKey(store.storeId, month, "TRAINING"), { kind: "RULE_CONFIGURATION_MISSING" as const }],
      [overviewObservationKey(store.storeId, month, "DRILL"), { kind: "SOURCE_INVALID" as const }],
      [overviewObservationKey(store.storeId, month, "ACTION_CLOSURE_RATE"), { kind: "SOURCE_INCOMPLETE" as const }],
    ]);
    const contributions = buildOverviewScoreContributions([store], [month], () => "2026-01-31", observations);
    expect(contributions).toHaveLength(12);
    expect(contributions.find((item) => item.metricId === "TRAINING")).toMatchObject({ earnedPoints: 0, availablePoints: 1, reason: "RULE_CONFIGURATION_MISSING" });
    expect(contributions.find((item) => item.metricId === "DRILL")).toMatchObject({ earnedPoints: 0, availablePoints: 1, reason: "SOURCE_INVALID" });
    expect(contributions.find((item) => item.metricId === "ACTION_CLOSURE_RATE")).toMatchObject({ earnedPoints: 0, availablePoints: 1, reason: "SOURCE_INCOMPLETE" });
  });

  it("maps ASTM NOT_OCCURRED to achieved and OCCURRED to not achieved", () => {
    const base = { metricId: "ASTM_INCIDENT" as const, dimensionId: "PERFORMANCE" as const, storeId: stores[0].storeId, month: months[0], referenceDate: "2026-01-31" };
    const noIncident = buildOverviewScoreContributions([stores[0]], [months[0]], () => base.referenceDate, new Map([[overviewObservationKey(base.storeId, base.month, base.metricId), { kind: "ASTM_RESULT" as const, result: "NOT_OCCURRED" as const }]]));
    const incident = buildOverviewScoreContributions([stores[0]], [months[0]], () => base.referenceDate, new Map([[overviewObservationKey(base.storeId, base.month, base.metricId), { kind: "ASTM_RESULT" as const, result: "OCCURRED" as const }]]));
    expect(noIncident.find((item) => item.metricId === "ASTM_INCIDENT")).toMatchObject({ earnedPoints: 1, reason: "ACHIEVED" });
    expect(incident.find((item) => item.metricId === "ASTM_INCIDENT")).toMatchObject({ earnedPoints: 0, reason: "RULE_NOT_MET" });
  });
});
