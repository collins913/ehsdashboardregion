import { roundOverviewScore } from "./prototype-overview-score"

export type PrototypeOverviewComparableScope = {
  id: string
  name: string
  current: number | null
  previous: number | null
  currentCompleteness: number
  previousCompleteness: number
}

export type PrototypeOverviewNumericMovement = PrototypeOverviewComparableScope & { delta: number }

export function rankPrototypeOverviewMovements(scopes: readonly PrototypeOverviewComparableScope[]) {
  const comparable: PrototypeOverviewNumericMovement[] = scopes.flatMap((scope) => {
    if (scope.current === null || scope.previous === null || !Number.isFinite(scope.current) || !Number.isFinite(scope.previous)
      || scope.currentCompleteness !== 100 || scope.previousCompleteness !== 100) return []
    return [{ ...scope, delta: roundOverviewScore(scope.current - scope.previous) }]
  })
  const stable = (left: PrototypeOverviewComparableScope, right: PrototypeOverviewComparableScope) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  const improving = comparable.filter((scope) => scope.delta >= 0)
    .sort((left, right) => right.delta - left.delta || stable(left, right)).slice(0, 3)
  const improvingIds = new Set(improving.map((scope) => scope.id))
  return {
    improving,
    declining: comparable.filter((scope) => scope.delta <= 0 && !improvingIds.has(scope.id))
      .sort((left, right) => left.delta - right.delta || stable(left, right)).slice(0, 3),
  }
}

export function selectPrototypeOverviewDeltaExtrema(scopes: readonly PrototypeOverviewComparableScope[]) {
  const ranked = rankPrototypeOverviewMovements(scopes)
  return { improving: ranked.improving[0] ?? null, declining: ranked.declining[0] ?? null }
}
