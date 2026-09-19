import type {
  OverviewDemoOperationalFacts,
  OverviewDemoOutcome,
  OverviewDemoScoredItemId,
  OverviewDemoStoreSnapshot,
} from "@/features/overview-demo/model/overview-demo-types";
import { overviewDemoScoredItems } from "@/features/overview-demo/model/overview-demo-score";

export const overviewDemoScoreRuleVersion = "overview-demo-v2";
export const overviewDemoCurrentPeriodLabel = "Q2 2026";
export const overviewDemoPreviousPeriodLabel = "Q1 2026";

export const overviewDemoAreaScenarioIndex: Readonly<Record<string, number>> = {
  北辰一部: 0,
  北辰二部: 1,
  南屿一部: 2,
  南屿二部: 3,
  西岭一部: 4,
  西岭二部: 5,
};

export function createOverviewDemoOutcomes(
  failed: readonly OverviewDemoScoredItemId[],
  missing: readonly OverviewDemoScoredItemId[] = [],
): Readonly<Record<OverviewDemoScoredItemId, OverviewDemoOutcome>> {
  const failedSet = new Set(failed);
  const missingSet = new Set(missing);

  return Object.fromEntries(
    overviewDemoScoredItems.map(({ id }) => [
      id,
      missingSet.has(id) ? "MISSING" : failedSet.has(id) ? "FAIL" : "PASS",
    ]),
  ) as Record<OverviewDemoScoredItemId, OverviewDemoOutcome>;
}

function store(
  storeId: string,
  failed: readonly OverviewDemoScoredItemId[],
  operationalFacts: OverviewDemoOperationalFacts,
  missing: readonly OverviewDemoScoredItemId[] = [],
): OverviewDemoStoreSnapshot {
  return {
    storeId,
    outcomes: createOverviewDemoOutcomes(failed, missing),
    operationalFacts,
  };
}

export const overviewDemoCurrentStores = [
  store("TEST-001", ["certificateSpecialWork"], { openActions: 1, openEvents: 0, submissionTotal: 18 }),
  store("TEST-002", ["events", "certificateSafeDriving"], { openActions: 2, openEvents: 1, submissionTotal: 15 }),
  store("TEST-003", ["training", "participationRateYtd", "certificateSafeDriving"], { openActions: 3, openEvents: 0, submissionTotal: 11 }),
  store("TEST-004", ["actions", "closeRate", "certificateSafeDriving"], { openActions: 5, openEvents: 1, submissionTotal: 9 }),
  store("TEST-005", ["drill", "actions", "participationRateYtd", "certificateSafetyHealth", "certificateSafeDriving"], { openActions: 8, openEvents: 2, submissionTotal: 6 }),
  store("TEST-006", ["drill", "actions", "inspections", "certificateFirstAid", "certificateSafeDriving"], { openActions: 7, openEvents: 3, submissionTotal: 5 }, ["averageSubmissionsYtd"]),
  store("TEST-007", ["events", "certificateSafeDriving"], { openActions: 2, openEvents: 1, submissionTotal: 17 }),
  store("TEST-008", ["closeRate", "averageSubmissionsYtd", "participationRateYtd"], { openActions: 3, openEvents: 0, submissionTotal: 13 }),
  store("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"], { openActions: 2, openEvents: 0, submissionTotal: 12 }),
  store("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"], { openActions: 6, openEvents: 2, submissionTotal: 10 }),
  store("TEST-011", ["actions", "certificateSafeDriving"], { openActions: 4, openEvents: 0, submissionTotal: 16 }),
  store("TEST-012", ["drill"], { openActions: 1, openEvents: 0, submissionTotal: 19 }),
] as const satisfies readonly OverviewDemoStoreSnapshot[];
