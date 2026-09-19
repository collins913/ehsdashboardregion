import type {
  OverviewDemoDimensionScore,
  OverviewDemoOutcome,
  OverviewDemoScoredItemId,
  OverviewDemoScore,
  OverviewDemoStoreSnapshot,
} from "./overview-demo-types";

export const overviewDemoScoredItems = [
  { id: "training", label: "Training", dimension: "PERFORMANCE", issueLabel: "Training 未达成", route: "/performance/kpi" },
  { id: "drill", label: "Drill", dimension: "PERFORMANCE", issueLabel: "Drill 未达成", route: "/performance/kpi" },
  { id: "actions", label: "Actions", dimension: "PERFORMANCE", issueLabel: "Action KPI 未达成", route: "/performance/kpi" },
  { id: "inspections", label: "Inspections", dimension: "PERFORMANCE", issueLabel: "Inspection 未达成", route: "/performance/kpi" },
  { id: "events", label: "Events", dimension: "PERFORMANCE", issueLabel: "Event 结果异常", route: "/risk/events" },
  { id: "closeRate", label: "Close Rate", dimension: "TAKE_CHARGE", issueLabel: "TCH Close Rate 未达成", route: "/performance/goals" },
  { id: "averageSubmissionsYtd", label: "Average Submissions YTD", dimension: "TAKE_CHARGE", issueLabel: "TCH 平均提交未达成", route: "/performance/goals" },
  { id: "participationRateYtd", label: "Participation Rate YTD", dimension: "TAKE_CHARGE", issueLabel: "TCH Participation 未达成", route: "/performance/goals" },
  { id: "certificateSafetyHealth", label: "安全健康", dimension: "CERTIFICATES", issueLabel: "安全健康证件异常", route: "/risk/certificates" },
  { id: "certificateFirstAid", label: "急救员", dimension: "CERTIFICATES", issueLabel: "急救员证件异常", route: "/risk/certificates" },
  { id: "certificateSpecialWork", label: "特种作业", dimension: "CERTIFICATES", issueLabel: "特种作业证件异常", route: "/risk/certificates" },
  { id: "certificateSafeDriving", label: "安全驾驶", dimension: "CERTIFICATES", issueLabel: "安全驾驶证件异常", route: "/risk/certificates" },
] as const satisfies readonly {
  id: OverviewDemoScoredItemId;
  label: string;
  dimension: "PERFORMANCE" | "TAKE_CHARGE" | "CERTIFICATES";
  issueLabel: string;
  route: string;
}[];

export const OVERVIEW_DEMO_EXPECTED_ITEM_COUNT = overviewDemoScoredItems.length;

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scoreOutcomes(
  outcomes: readonly OverviewDemoOutcome[],
  expectedCount = outcomes.length,
): OverviewDemoScore {
  const available = outcomes.filter((outcome) => outcome !== "MISSING");
  const passedCount = available.filter((outcome) => outcome === "PASS").length;
  const availableCount = available.length;

  return {
    score: availableCount === 0 ? null : Math.round((passedCount / availableCount) * 100),
    passedCount,
    availableCount,
    expectedCount,
    completeness: expectedCount === 0 ? 0 : roundPercent((availableCount / expectedCount) * 100),
  };
}

export function scoreStores(
  stores: readonly OverviewDemoStoreSnapshot[],
): OverviewDemoScore {
  return scoreOutcomes(
    stores.flatMap((store) => overviewDemoScoredItems.map((item) => store.outcomes[item.id])),
    stores.length * OVERVIEW_DEMO_EXPECTED_ITEM_COUNT,
  );
}

export function scoreDimensions(
  stores: readonly OverviewDemoStoreSnapshot[],
): readonly OverviewDemoDimensionScore[] {
  return ([
    ["PERFORMANCE", "Performance"],
    ["TAKE_CHARGE", "Take Charge"],
    ["CERTIFICATES", "Certificates"],
  ] as const).map(([id, label]) => {
    const items = overviewDemoScoredItems.filter((item) => item.dimension === id);
    const outcomes = stores.flatMap((store) => items.map((item) => store.outcomes[item.id]));
    const result = scoreOutcomes(outcomes, stores.length * items.length);
    return {
      ...result,
      id,
      label,
      failedCount: outcomes.filter((outcome) => outcome === "FAIL").length,
    };
  });
}
