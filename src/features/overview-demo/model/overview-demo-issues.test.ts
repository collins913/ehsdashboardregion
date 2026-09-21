import { describe, expect, it } from "vitest"
import { createOverviewDemoOutcomes } from "@/data/mock/overview-demo/overview-demo-data"
import { buildOverviewDemoAttribution } from "./overview-demo-attribution"
import { buildOverviewDemoIssueIntelligence, calculateOverviewDemoPersistenceRate, overviewDemoLifecycleCategories } from "./overview-demo-issues"

describe("Overview Demo persistence rate", () => {
  it.each([
    [0, 0, null],
    [0, 4, 0],
    [4, 4, 100],
    [2, 5, 40],
  ])("calculates %s persistent over %s current", (persistent, current, expected) => {
    expect(calculateOverviewDemoPersistenceRate(persistent, current)).toBe(expected)
  })
})

describe("Overview Demo issue intelligence", () => {
  it("calculates lifecycle, area distribution and concentration", () => {
    const identities = [
      { storeId: "1", storeLabel: "一店", area: "A" },
      { storeId: "2", storeLabel: "二店", area: "A" },
      { storeId: "3", storeLabel: "三店", area: "B" },
    ]
    const previous = identities.map((store) => ({ storeId: store.storeId, outcomes: createOverviewDemoOutcomes(store.storeId === "1" ? ["actions"] : []), operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 } }))
    const current = identities.map((store) => ({ storeId: store.storeId, outcomes: createOverviewDemoOutcomes(["actions"]), operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 } }))
    const attribution = buildOverviewDemoAttribution({ current, previous, identities })
    const action = buildOverviewDemoIssueIntelligence({ current, previous, identities, attribution }).find((item) => item.id === "actions")
    expect(action).toMatchObject({ currentCount: 3, previousCount: 1, newIssueCount: 2, persistentIssueCount: 1, persistenceRate: 33, affectedAreaCount: 2, topAreaShare: 67, top2AreaShare: 100, lifecycle: { current: 3, new: 2, persistent: 1, previous: 1, recovered: 0, delta: 2 } })
    expect(action?.areaDistribution[0]).toMatchObject({ area: "A", count: 2 })
    expect(action?.lifecycle.current).toBe((action?.lifecycle.new ?? 0) + (action?.lifecycle.persistent ?? 0))
    expect(action?.lifecycle.previous).toBe((action?.lifecycle.persistent ?? 0) + (action?.lifecycle.recovered ?? 0))
    expect(overviewDemoLifecycleCategories).toEqual(["新增", "持续", "已恢复"])
  })
})
