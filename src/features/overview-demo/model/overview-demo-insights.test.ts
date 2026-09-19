import { describe, expect, it } from "vitest"
import { buildOverviewDemoExecutiveInsight } from "./overview-demo-insights"
import type { OverviewDemoAttribution, OverviewDemoAttributionItem, OverviewDemoIssueView, OverviewDemoScopeComparison } from "./overview-demo-types"

const comparisons: OverviewDemoScopeComparison[] = [
  { id: "a", rank: 1, label: "改善小区", level: "AREA", score: 91, previousScore: 83, delta: 8, completeness: 100, storeCount: 2, topHint: "主要改善" },
  { id: "c", rank: 2, label: "关注小区", level: "AREA", score: 61, previousScore: 70, delta: -9, completeness: 92, storeCount: 2, topHint: "新增拖累" },
]
const attributionItem: OverviewDemoAttributionItem = { metricKey: "actions", label: "Action KPI 未达成", dimension: "PERFORMANCE", transition: "NEW_ISSUE", previousResult: "PASS", currentResult: "FAIL", affectedStores: [{ storeId: "1", storeLabel: "门店", area: "南屿一部" }], affectedAreas: ["南屿一部"], impactDirection: "NEGATIVE" }
const attribution: OverviewDemoAttribution = { newIssues: [attributionItem], persistentIssues: [], recovered: [], stableGood: [], missing: [], declineDrivers: [attributionItem], improvementDrivers: [] }
const issue = { id: "actions", label: "Action KPI 未达成", route: "/risk/actions", currentCount: 6, previousCount: 2, delta: 4, newIssueCount: 4, persistentIssueCount: 2, persistenceRate: 33, recoveredCount: 0, affectedAreaCount: 3, totalAreaCount: 6, topAreaShare: 50, top2AreaShare: 80, top3AreaShare: 100, areaDistribution: [], affectedStores: [], conclusion: "集中" } satisfies OverviewDemoIssueView

describe("Overview Demo executive insights", () => {
  const result = buildOverviewDemoExecutiveInsight({
    overall: { score: 82, passedCount: 98, availableCount: 119, expectedCount: 120, completeness: 99.17 },
    overallDelta: 4,
    previousPeriodLabel: "Q1 2026",
    comparisons,
    issues: [issue],
    attribution,
    storeCount: 10,
  })

  it("identifies low, decline, new issue and driver", () => {
    expect(result.lowestScope).toContain("关注小区")
    expect(result.largestDecline).toContain("关注小区")
    expect(result.biggestNewIssue).toContain("Action")
    expect(result.primaryDeclineDriver).toContain("Action")
  })

  it("returns four visual signals and one concise executive note", () => {
    expect(result.priorityScope.value).toBe("关注小区")
    expect(result.declineSignal.value).toContain("Action KPI 未达成")
    expect(result.systemicSignal.value).toContain("Action KPI 未达成")
    expect(result.improvementSignal.value).toBe("改善小区")
    expect(result.note.split("。").filter(Boolean)).toHaveLength(2)
  })
})
