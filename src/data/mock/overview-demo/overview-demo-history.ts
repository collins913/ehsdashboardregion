import type {
  PrototypeOverviewPeriodSnapshot,
  PrototypeOverviewScoredItemId,
  PrototypeOverviewStoreSnapshot,
} from "@/data/prototype/overview/model/prototype-overview-types"
import { createPrototypeOverviewOutcomes, prototypeOverviewCurrentStores } from "./overview-demo-data"
import { prototypeOverviewScoredItems, scoreStores } from "@/data/prototype/overview/model/prototype-overview-score"

function historyStore(storeId: string, failed: readonly PrototypeOverviewScoredItemId[]): PrototypeOverviewStoreSnapshot {
  return {
    storeId,
    outcomes: createPrototypeOverviewOutcomes(failed),
    operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 },
  }
}

export const prototypeOverviewQ3_2025Stores = [
  historyStore("TEST-001", ["training", "drill", "actions", "participationRateYtd", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-002", ["events", "closeRate", "participationRateYtd", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-003", ["training", "closeRate", "certificateSafeDriving"]),
  historyStore("TEST-004", ["actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-005", []),
  historyStore("TEST-006", []),
  historyStore("TEST-007", ["training", "drill", "actions", "events", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-008", ["training", "events", "closeRate", "submissionsPerCapitaYtd", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-011", []),
  historyStore("TEST-012", []),
] as const satisfies readonly PrototypeOverviewStoreSnapshot[]

export const prototypeOverviewQ4_2025Stores = [
  historyStore("TEST-001", ["drill", "actions", "participationRateYtd", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-002", ["events", "participationRateYtd", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-003", ["training", "closeRate", "certificateSafeDriving"]),
  historyStore("TEST-004", ["actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-005", ["certificateSafeDriving"]),
  historyStore("TEST-006", ["certificateSafeDriving"]),
  historyStore("TEST-007", ["training", "drill", "actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-008", ["events", "closeRate", "submissionsPerCapitaYtd", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-011", []),
  historyStore("TEST-012", []),
] as const satisfies readonly PrototypeOverviewStoreSnapshot[]

export const prototypeOverviewPreviousStores = [
  historyStore("TEST-001", ["drill", "actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-002", ["events", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-003", ["training", "closeRate", "certificateSafeDriving"]),
  historyStore("TEST-004", ["actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-005", ["participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-006", ["drill", "certificateFirstAid", "certificateSafeDriving"]),
  historyStore("TEST-007", ["training", "drill", "actions", "participationRateYtd", "certificateSafeDriving"]),
  historyStore("TEST-008", ["events", "closeRate", "submissionsPerCapitaYtd", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-009", ["drill", "certificateSpecialWork", "certificateSafeDriving"]),
  historyStore("TEST-010", ["actions", "events", "participationRateYtd", "certificateFirstAid"]),
  historyStore("TEST-011", []),
  historyStore("TEST-012", []),
] as const satisfies readonly PrototypeOverviewStoreSnapshot[]

// Extra Standard stores have varied outcome counts, with two intentional duplicate pairs.
// Scores still come from the unchanged Prototype scoring rules.
const occupiedPositions = new Set(prototypeOverviewCurrentStores.map((current, index) => {
  const score = scoreStores([current]).score!
  return `${score},${score - scoreStores([prototypeOverviewPreviousStores[index]]).score!}`
}))
const extraScenarios: { current: PrototypeOverviewStoreSnapshot; previous: PrototypeOverviewStoreSnapshot }[] = []
for (let index = 0; index < 54 && extraScenarios.length < 36; index += 1) {
  const permutation = (index * 17) % 54
  const currentFailedCount = Math.floor(permutation / 9)
  const previousFailedCount = permutation % 9
  const rotatedItems = prototypeOverviewScoredItems.map((_, offset) => prototypeOverviewScoredItems[(offset + index) % prototypeOverviewScoredItems.length].id)
  const current = historyStore("", rotatedItems.slice(0, currentFailedCount))
  const previous = historyStore("", rotatedItems.slice(0, previousFailedCount))
  const score = scoreStores([current]).score!
  const key = `${score},${score - scoreStores([previous]).score!}`
  if (occupiedPositions.has(key)) continue
  occupiedPositions.add(key)
  extraScenarios.push({ current, previous })
}
if (extraScenarios.length !== 36) throw new Error("Insufficient distinct Prototype score scenarios")
const standardExtraScenarios = [...extraScenarios, extraScenarios[7], extraScenarios[23]].map((scenario, index) => {
  const storeId = `TEST-${String(index + 13).padStart(3, "0")}`
  return {
    current: { ...scenario.current, storeId },
    previous: { ...scenario.previous, storeId },
  }
})
export const prototypeOverviewExpandedCurrentStores = [
  ...prototypeOverviewCurrentStores, ...standardExtraScenarios.map(({ current }) => current),
]
export const prototypeOverviewExpandedPreviousStores = [
  ...prototypeOverviewPreviousStores, ...standardExtraScenarios.map(({ previous }) => previous),
]
const expandedQ3Stores = [...prototypeOverviewQ3_2025Stores, ...standardExtraScenarios.map(({ previous }) => previous)]
const expandedQ4Stores = [...prototypeOverviewQ4_2025Stores, ...standardExtraScenarios.map(({ previous }) => previous)]

// Experimental monthly fixture: deterministic transitions between existing story anchors.
// The last month is the current result; these are not production snapshots.
function monthlyStores(
  from: readonly PrototypeOverviewStoreSnapshot[],
  to: readonly PrototypeOverviewStoreSnapshot[],
  step: number,
  steps: number,
): PrototypeOverviewStoreSnapshot[] {
  return from.map((store, storeIndex) => ({
    ...store,
    outcomes: Object.fromEntries(prototypeOverviewScoredItems.map((item, itemIndex) => [
      item.id,
      (storeIndex * 7 + itemIndex * 3) % steps < step
        ? to[storeIndex].outcomes[item.id]
        : store.outcomes[item.id],
    ])) as PrototypeOverviewStoreSnapshot["outcomes"],
  }))
}

export const prototypeOverviewMonthlyHistoryPeriods = [
  { periodLabel: "2025-07", stores: expandedQ3Stores },
  { periodLabel: "2025-08", stores: monthlyStores(expandedQ3Stores, expandedQ4Stores, 1, 3) },
  { periodLabel: "2025-09", stores: monthlyStores(expandedQ3Stores, expandedQ4Stores, 2, 3) },
  { periodLabel: "2025-10", stores: expandedQ4Stores },
  { periodLabel: "2025-11", stores: monthlyStores(expandedQ4Stores, prototypeOverviewExpandedPreviousStores, 1, 3) },
  { periodLabel: "2025-12", stores: monthlyStores(expandedQ4Stores, prototypeOverviewExpandedPreviousStores, 2, 3) },
  { periodLabel: "2026-01", stores: prototypeOverviewExpandedPreviousStores },
  { periodLabel: "2026-02", stores: monthlyStores(prototypeOverviewExpandedPreviousStores, prototypeOverviewExpandedCurrentStores, 1, 5) },
  { periodLabel: "2026-03", stores: monthlyStores(prototypeOverviewExpandedPreviousStores, prototypeOverviewExpandedCurrentStores, 2, 5) },
  { periodLabel: "2026-04", stores: monthlyStores(prototypeOverviewExpandedPreviousStores, prototypeOverviewExpandedCurrentStores, 3, 5) },
  { periodLabel: "2026-05", stores: monthlyStores(prototypeOverviewExpandedPreviousStores, prototypeOverviewExpandedCurrentStores, 4, 5) },
  { periodLabel: "2026-06", stores: prototypeOverviewExpandedCurrentStores },
] as const satisfies readonly PrototypeOverviewPeriodSnapshot[]
