import type {
  OverviewDemoPeriodSnapshot,
  OverviewDemoScoredItemId,
  OverviewDemoStoreSnapshot,
} from "@/features/overview-demo/model/overview-demo-types"
import { createOverviewDemoOutcomes, overviewDemoCurrentStores } from "./overview-demo-data"
import { overviewDemoScoredItems } from "@/features/overview-demo/model/overview-demo-score"

function historyStore(storeId: string, failed: readonly OverviewDemoScoredItemId[]): OverviewDemoStoreSnapshot {
  return {
    storeId,
    outcomes: createOverviewDemoOutcomes(failed),
    operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 },
  }
}

export const overviewDemoQ3_2025Stores = [
  historyStore("TEST-001", ["training", "drill", "actions", "participationRateYtd", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-002", ["events", "closeRate", "participationRateYtd", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-003", ["training", "closeRate", "certificateSafeDriving"]),
  historyStore("TEST-004", ["actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-005", []),
  historyStore("TEST-006", []),
  historyStore("TEST-007", ["training", "drill", "actions", "events", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-008", ["training", "events", "closeRate", "averageSubmissionsYtd", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-011", []),
  historyStore("TEST-012", []),
] as const satisfies readonly OverviewDemoStoreSnapshot[]

export const overviewDemoQ4_2025Stores = [
  historyStore("TEST-001", ["drill", "actions", "participationRateYtd", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-002", ["events", "participationRateYtd", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-003", ["training", "closeRate", "certificateSafeDriving"]),
  historyStore("TEST-004", ["actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-005", ["certificateSafeDriving"]),
  historyStore("TEST-006", ["certificateSafeDriving"]),
  historyStore("TEST-007", ["training", "drill", "actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-008", ["events", "closeRate", "averageSubmissionsYtd", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-011", []),
  historyStore("TEST-012", []),
] as const satisfies readonly OverviewDemoStoreSnapshot[]

export const overviewDemoPreviousStores = [
  historyStore("TEST-001", ["drill", "actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-002", ["events", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-003", ["training", "closeRate", "certificateSafeDriving"]),
  historyStore("TEST-004", ["actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-005", ["participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-006", ["drill", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-007", ["training", "drill", "actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-008", ["events", "closeRate", "averageSubmissionsYtd", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-011", []),
  historyStore("TEST-012", []),
] as const satisfies readonly OverviewDemoStoreSnapshot[]

// Experimental monthly fixture: deterministic transitions between existing story anchors.
// The last month is the current result; these are not production snapshots.
function monthlyStores(
  from: readonly OverviewDemoStoreSnapshot[],
  to: readonly OverviewDemoStoreSnapshot[],
  step: number,
  steps: number,
): OverviewDemoStoreSnapshot[] {
  return from.map((store, storeIndex) => ({
    ...store,
    outcomes: Object.fromEntries(overviewDemoScoredItems.map((item, itemIndex) => [
      item.id,
      (storeIndex * 7 + itemIndex * 3) % steps < step
        ? to[storeIndex].outcomes[item.id]
        : store.outcomes[item.id],
    ])) as OverviewDemoStoreSnapshot["outcomes"],
  }))
}

export const overviewDemoMonthlyHistoryPeriods = [
  { periodLabel: "2025-07", stores: overviewDemoQ3_2025Stores },
  { periodLabel: "2025-08", stores: monthlyStores(overviewDemoQ3_2025Stores, overviewDemoQ4_2025Stores, 1, 3) },
  { periodLabel: "2025-09", stores: monthlyStores(overviewDemoQ3_2025Stores, overviewDemoQ4_2025Stores, 2, 3) },
  { periodLabel: "2025-10", stores: overviewDemoQ4_2025Stores },
  { periodLabel: "2025-11", stores: monthlyStores(overviewDemoQ4_2025Stores, overviewDemoPreviousStores, 1, 3) },
  { periodLabel: "2025-12", stores: monthlyStores(overviewDemoQ4_2025Stores, overviewDemoPreviousStores, 2, 3) },
  { periodLabel: "2026-01", stores: overviewDemoPreviousStores },
  { periodLabel: "2026-02", stores: monthlyStores(overviewDemoPreviousStores, overviewDemoCurrentStores, 1, 5) },
  { periodLabel: "2026-03", stores: monthlyStores(overviewDemoPreviousStores, overviewDemoCurrentStores, 2, 5) },
  { periodLabel: "2026-04", stores: monthlyStores(overviewDemoPreviousStores, overviewDemoCurrentStores, 3, 5) },
  { periodLabel: "2026-05", stores: monthlyStores(overviewDemoPreviousStores, overviewDemoCurrentStores, 4, 5) },
  { periodLabel: "2026-06", stores: overviewDemoCurrentStores },
] as const satisfies readonly OverviewDemoPeriodSnapshot[]
