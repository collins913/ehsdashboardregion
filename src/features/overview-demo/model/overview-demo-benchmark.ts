import type { OverviewDemoBenchmark, OverviewDemoScopeComparison } from "./overview-demo-types"

export function averageOverviewDemoScore(
  comparisons: readonly Pick<OverviewDemoScopeComparison, "score">[],
): number | null {
  const scores = comparisons.flatMap((item) => (item.score === null ? [] : [item.score]))
  if (scores.length === 0) return null
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
}

export function rankOverviewDemoScopes(
  comparisons: readonly OverviewDemoScopeComparison[],
): OverviewDemoScopeComparison[] {
  const sorted = [...comparisons].sort((left, right) => {
    if (left.score === null) return 1
    if (right.score === null) return -1
    return right.score - left.score || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  })
  return sorted.map((item, index) => ({ ...item, rank: item.score === null ? null : index + 1 }))
}

export function buildOverviewDemoBenchmark(input: {
  id: string
  parentLabel: string
  comparisons: readonly OverviewDemoScopeComparison[]
}): OverviewDemoBenchmark {
  const ranked = rankOverviewDemoScopes(input.comparisons)
  const target = ranked.find((item) => item.id === input.id)
  return {
    parentLabel: input.parentLabel,
    parentAverage: averageOverviewDemoScore(ranked),
    rank: target?.rank ?? null,
    total: ranked.length,
  }
}
