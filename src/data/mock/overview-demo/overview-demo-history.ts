import type {
  OverviewDemoPeriodSnapshot,
  OverviewDemoScoredItemId,
  OverviewDemoStoreSnapshot,
} from "@/features/overview-demo/model/overview-demo-types"
import { createOverviewDemoOutcomes, overviewDemoCurrentStores } from "./overview-demo-data"

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

export const overviewDemoHistoryPeriods = [
  { periodLabel: "Q3 2025", stores: overviewDemoQ3_2025Stores },
  { periodLabel: "Q4 2025", stores: overviewDemoQ4_2025Stores },
  { periodLabel: "Q1 2026", stores: overviewDemoPreviousStores },
  { periodLabel: "Q2 2026", stores: overviewDemoCurrentStores },
] as const satisfies readonly OverviewDemoPeriodSnapshot[]
