import { describe, expect, it } from "vitest"
import { averageOverviewDemoScore, buildOverviewDemoBenchmark, rankOverviewDemoScopes } from "./overview-demo-benchmark"
import type { OverviewDemoScopeComparison } from "./overview-demo-types"

const comparisons: OverviewDemoScopeComparison[] = [
  { id: "a", rank: null, label: "A", level: "AREA", score: 80, previousScore: 70, delta: 10, completeness: 100, storeCount: 2, topHint: "改善" },
  { id: "b", rank: null, label: "B", level: "AREA", score: 60, previousScore: 65, delta: -5, completeness: 100, storeCount: 2, topHint: "下降" },
]

describe("Overview Demo benchmark", () => {
  it("calculates average and rank", () => {
    expect(averageOverviewDemoScore(comparisons)).toBe(70)
    expect(rankOverviewDemoScopes(comparisons).map((item) => item.id)).toEqual(["a", "b"])
    expect(buildOverviewDemoBenchmark({ id: "b", parentLabel: "区域", comparisons })).toMatchObject({ parentAverage: 70, rank: 2, total: 2 })
  })
})
