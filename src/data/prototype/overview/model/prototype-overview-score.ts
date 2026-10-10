import type {
  PrototypeOverviewDimensionScore,
  PrototypeOverviewOutcome,
  PrototypeOverviewScoredItemId,
  PrototypeOverviewScore,
  PrototypeOverviewStoreSnapshot,
} from "./prototype-overview-types";

export const prototypeOverviewScoredItems = [
  { id: "training", label: "Training", dimension: "PERFORMANCE", issueLabel: "Training 未达成", route: "/performance/kpi" },
  { id: "drill", label: "Drill", dimension: "PERFORMANCE", issueLabel: "Drill 未达成", route: "/performance/kpi" },
  { id: "actions", label: "Actions", dimension: "PERFORMANCE", issueLabel: "Action KPI 未达成", route: "/performance/kpi" },
  { id: "inspections", label: "Inspections", dimension: "PERFORMANCE", issueLabel: "Inspection 未达成", route: "/performance/kpi" },
  { id: "events", label: "Events", dimension: "PERFORMANCE", issueLabel: "Event 结果异常", route: "/risk/events" },
  { id: "closeRate", label: "Close Rate", dimension: "TAKE_CHARGE", issueLabel: "TCH Close Rate 未达成", route: "/performance/goals" },
  { id: "submissionsPerCapitaYtd", label: "Submissions per Capita YTD", dimension: "TAKE_CHARGE", issueLabel: "TCH 人均提交数未达成", route: "/performance/goals" },
  { id: "participationRateYtd", label: "Participation Rate YTD", dimension: "TAKE_CHARGE", issueLabel: "TCH Participation 未达成", route: "/performance/goals" },
  { id: "certificateSafetyHealth", label: "安全健康", dimension: "CERTIFICATES", issueLabel: "安全健康证件异常", route: "/risk/certificates" },
  { id: "certificateFirstAid", label: "急救员", dimension: "CERTIFICATES", issueLabel: "急救员证件异常", route: "/risk/certificates" },
  { id: "certificateSpecialWork", label: "特种作业", dimension: "CERTIFICATES", issueLabel: "特种作业证件异常", route: "/risk/certificates" },
  { id: "certificateSafeDriving", label: "安全驾驶", dimension: "CERTIFICATES", issueLabel: "安全驾驶证件异常", route: "/risk/certificates" },
] as const satisfies readonly {
  id: PrototypeOverviewScoredItemId;
  label: string;
  dimension: "PERFORMANCE" | "TAKE_CHARGE" | "CERTIFICATES";
  issueLabel: string;
  route: string;
}[];

export const OVERVIEW_DEMO_EXPECTED_ITEM_COUNT = prototypeOverviewScoredItems.length;

export function roundOverviewScore(value: number): number {
  const magnitude = Math.abs(value);
  const rounded = Math.round((magnitude + Number.EPSILON * Math.max(1, magnitude)) * 10) / 10;
  return rounded === 0 ? 0 : value < 0 ? -rounded : rounded;
}

export function scoreOutcomes(
  outcomes: readonly PrototypeOverviewOutcome[],
  expectedCount = outcomes.length,
): PrototypeOverviewScore {
  const available = outcomes.filter((outcome) => outcome !== "MISSING");
  const passedCount = available.filter((outcome) => outcome === "PASS").length;
  const availableCount = available.length;

  return {
    score: availableCount === 0 ? null : roundOverviewScore((passedCount / availableCount) * 100),
    passedCount,
    availableCount,
    expectedCount,
    completeness: expectedCount === 0 ? 0 : roundOverviewScore((availableCount / expectedCount) * 100),
  };
}

export function scoreStores(
  stores: readonly PrototypeOverviewStoreSnapshot[],
): PrototypeOverviewScore {
  return scoreOutcomes(
    stores.flatMap((store) => prototypeOverviewScoredItems.map((item) => store.outcomes[item.id])),
    stores.length * OVERVIEW_DEMO_EXPECTED_ITEM_COUNT,
  );
}

export function scoreDimensions(
  stores: readonly PrototypeOverviewStoreSnapshot[],
): readonly PrototypeOverviewDimensionScore[] {
  return ([
    ["PERFORMANCE", "Performance"],
    ["TAKE_CHARGE", "Take Charge"],
    ["CERTIFICATES", "Certificates"],
  ] as const).map(([id, label]) => {
    const items = prototypeOverviewScoredItems.filter((item) => item.dimension === id);
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
