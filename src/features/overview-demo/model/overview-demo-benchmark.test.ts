import { describe, expect, it } from "vitest"
import { averageOverviewDemoScore, buildOverviewDemoBenchmark, rankOverviewDemoScopes } from "./overview-demo-benchmark"
import type { OverviewDemoScopeComparison } from "./overview-demo-types"

const comparisons: OverviewDemoScopeComparison[] = [
  { id: "a", rank: null, label: "A", level: "AREA", score: 80, previousScore: 70, delta: 10, completeness: 100, storeCount: 2, mainChange: "Improved", currentConcern: "None" },
  { id: "b", rank: null, label: "B", level: "AREA", score: 60, previousScore: 65, delta: -5, completeness: 100, storeCount: 2, mainChange: "Declined", currentConcern: "Issue" },
]

describe("Overview Demo benchmark", () => {
  it("calculates average and rank", () => {
    expect(averageOverviewDemoScore(comparisons)).toBe(70)
    expect(rankOverviewDemoScopes(comparisons).map((item) => item.id)).toEqual(["a", "b"])
    expect(buildOverviewDemoBenchmark({ id: "b", parentLabel: "区域", comparisons })).toMatchObject({ parentAverage: 70, rank: 2, total: 2 })
  })

  it("uses deterministic standard competition ranking for ties", () => {
    const tied = rankOverviewDemoScopes([
      { ...comparisons[1], id: "b", label: "B", score: 90 },
      { ...comparisons[0], id: "a", label: "A", score: 90 },
      { ...comparisons[1], id: "c", label: "C", score: 70 },
    ])
    expect(tied.map(({ id, rank, rankLabel, isTied }) => ({ id, rank, rankLabel, isTied }))).toEqual([
      { id: "a", rank: 1, rankLabel: "并列第 1 / 3", isTied: true },
      { id: "b", rank: 1, rankLabel: "并列第 1 / 3", isTied: true },
      { id: "c", rank: 3, rankLabel: "第 3 / 3", isTied: false },
    ])
  })
})
