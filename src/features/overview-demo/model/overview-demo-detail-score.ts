import { overviewDemoScoredItems, scoreStores } from "./overview-demo-score"
import type { OverviewDemoScoreChange, OverviewDemoStoreSnapshot } from "./overview-demo-types"

// Decompose the existing equal-item score at its actual available-item denominator.
// Keep two decimals for presentation; the displayed overall score is rounded separately.
export function buildOverviewDemoScoreChanges(
  current: readonly OverviewDemoStoreSnapshot[],
  previous: readonly OverviewDemoStoreSnapshot[],
): OverviewDemoScoreChange[] {
  const currentAvailable = scoreStores(current).availableCount
  const previousAvailable = scoreStores(previous).availableCount
  // A changing denominator cannot be assigned to individual items without an arbitrary convention.
  if (currentAvailable === 0 || previousAvailable === 0 || currentAvailable !== previousAvailable) return []

  return overviewDemoScoredItems.flatMap((item) => {
    const currentPassed = current.filter((store) => store.outcomes[item.id] === "PASS").length
    const previousPassed = previous.filter((store) => store.outcomes[item.id] === "PASS").length
    const deltaPoints = Math.round(10000 * (currentPassed / currentAvailable - previousPassed / previousAvailable)) / 100
    if (deltaPoints === 0) return []
    return [{ key: item.id, label: item.label, deltaPoints, direction: deltaPoints > 0 ? "up" as const : "down" as const }]
  })
}
