import { prototypeOverviewScoredItems, roundOverviewScore, scoreStores } from "./prototype-overview-score"
import type { PrototypeOverviewScoreChange, PrototypeOverviewStoreSnapshot } from "./prototype-overview-types"

// Decompose the existing equal-item score at its actual available-item denominator.
// Score calculations keep one decimal; rate presentation may display an integer percentage.
export function buildPrototypeOverviewScoreChanges(
  current: readonly PrototypeOverviewStoreSnapshot[],
  previous: readonly PrototypeOverviewStoreSnapshot[],
): PrototypeOverviewScoreChange[] {
  const currentAvailable = scoreStores(current).availableCount
  const previousAvailable = scoreStores(previous).availableCount
  // A changing denominator cannot be assigned to individual items without an arbitrary convention.
  if (currentAvailable === 0 || previousAvailable === 0 || currentAvailable !== previousAvailable) return []

  return prototypeOverviewScoredItems.flatMap((item) => {
    const currentPassed = current.filter((store) => store.outcomes[item.id] === "PASS").length
    const previousPassed = previous.filter((store) => store.outcomes[item.id] === "PASS").length
    const deltaPoints = roundOverviewScore(100 * (currentPassed / currentAvailable - previousPassed / previousAvailable))
    if (deltaPoints === 0) return []
    return [{ key: item.id, label: item.label, deltaPoints, direction: deltaPoints > 0 ? "up" as const : "down" as const }]
  })
}
