import { describe, expect, it } from "vitest"
import { buildPrototypeOverviewPriorityInvestigations } from "./prototype-overview-priority"
import type { PrototypeOverviewAttribution, PrototypeOverviewAttributionItem, PrototypeOverviewIssueView, PrototypeOverviewItemId } from "./prototype-overview-types"

function issue(id: PrototypeOverviewItemId, current: number, fresh: number, persistent: number): PrototypeOverviewIssueView {
  return { id, label: id, route: `/route/${id}`, currentCount: current, previousCount: persistent, delta: fresh, newIssueCount: fresh, persistentIssueCount: persistent, persistenceRate: current === 0 ? null : Math.round(persistent / current * 100), recoveredCount: 0, lifecycle: { current, new: fresh, persistent, previous: persistent, recovered: 0, delta: fresh }, affectedAreaCount: 1, totalAreaCount: 1, topAreaShare: 100, top2AreaShare: 100, top3AreaShare: 100, areaDistribution: [], affectedStores: [], conclusion: "" }
}

function attributionItem(metricKey: PrototypeOverviewItemId): PrototypeOverviewAttributionItem {
  return { metricKey, label: metricKey, dimension: "PERFORMANCE", transition: "NEW_ISSUE", previousResult: "PASS", currentResult: "FAIL", affectedStores: [], affectedAreas: [], impactDirection: "NEGATIVE" }
}

describe("Overview Demo priority investigation", () => {
  it("orders persistent decline, new decline, persistent, then deterministic ties", () => {
    const attribution: PrototypeOverviewAttribution = { newIssues: [], persistentIssues: [], recovered: [], stableGood: [], missing: [], declineDrivers: [attributionItem("actions"), attributionItem("drill")], improvementDrivers: [] }
    const result = buildPrototypeOverviewPriorityInvestigations({ issues: [issue("events", 5, 0, 5), issue("training", 4, 4, 0), issue("drill", 3, 3, 0), issue("actions", 2, 0, 2), issue("inspections", 4, 4, 0)], attribution })
    expect(result.map((item) => item.issueKey)).toEqual(["actions", "drill", "events", "inspections", "training"])
    expect(result[0].reason).toContain("持续")
    expect(result[1].reason).toContain("新增")
    expect(result[0].issueKey).not.toBe(attribution.declineDrivers[1].metricKey)
  })
})
