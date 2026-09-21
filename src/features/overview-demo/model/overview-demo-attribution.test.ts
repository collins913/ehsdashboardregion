import { describe, expect, it } from "vitest"
import { createOverviewDemoOutcomes } from "@/data/mock/overview-demo/overview-demo-data"
import { buildOverviewDemoAttribution, buildOverviewDemoScopeChangeSummary, classifyOverviewDemoTransition } from "./overview-demo-attribution"
import type { OverviewDemoAttribution, OverviewDemoAttributionItem } from "./overview-demo-types"

function item(metricKey: "actions" | "drill", transition: "NEW_ISSUE" | "PERSISTENT_ISSUE" | "RECOVERED"): OverviewDemoAttributionItem {
  return { metricKey, label: `${metricKey} concern`, dimension: "PERFORMANCE", transition, previousResult: transition === "RECOVERED" ? "FAIL" : "PASS", currentResult: transition === "RECOVERED" ? "PASS" : "FAIL", affectedStores: [], affectedAreas: [], impactDirection: transition === "RECOVERED" ? "POSITIVE" : transition === "NEW_ISSUE" ? "NEGATIVE" : "NEUTRAL" }
}

describe("Overview Demo attribution", () => {
  it.each([
    ["PASS", "FAIL", "NEW_ISSUE"],
    ["FAIL", "FAIL", "PERSISTENT_ISSUE"],
    ["FAIL", "PASS", "RECOVERED"],
    ["PASS", "PASS", "STABLE_GOOD"],
    ["MISSING", "FAIL", "MISSING"],
    ["PASS", "MISSING", "MISSING"],
  ] as const)("classifies %s to %s", (previous, current, expected) => {
    expect(classifyOverviewDemoTransition(previous, current)).toBe(expected)
  })

  it("aggregates affected stores and areas without contribution assumptions", () => {
    const previous = [{ storeId: "1", outcomes: createOverviewDemoOutcomes([]), operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 } }]
    const current = [{ storeId: "1", outcomes: createOverviewDemoOutcomes(["actions"]), operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 } }]
    const result = buildOverviewDemoAttribution({ current, previous, identities: [{ storeId: "1", storeLabel: "门店 1", area: "南屿一部" }] })
    expect(result.newIssues[0]).toMatchObject({ metricKey: "actions", previousResult: "PASS", currentResult: "FAIL", affectedAreas: ["南屿一部"] })
  })

  it("separates period change drivers from current concerns", () => {
    const recovered = item("actions", "RECOVERED")
    const persistent = item("drill", "PERSISTENT_ISSUE")
    const attribution: OverviewDemoAttribution = { newIssues: [], persistentIssues: [persistent], recovered: [recovered], stableGood: [], missing: [], declineDrivers: [], improvementDrivers: [recovered] }
    expect(buildOverviewDemoScopeChangeSummary(8, attribution)).toEqual({ mainChange: "主要改善：Actions 已恢复", currentConcern: "当前关注问题：drill concern", changeKind: "IMPROVEMENT" })
  })

  it("uses only new issues as decline drivers", () => {
    const fresh = item("actions", "NEW_ISSUE")
    const persistent = item("drill", "PERSISTENT_ISSUE")
    const attribution: OverviewDemoAttribution = { newIssues: [fresh], persistentIssues: [persistent], recovered: [], stableGood: [], missing: [], declineDrivers: [fresh], improvementDrivers: [] }
    expect(buildOverviewDemoScopeChangeSummary(-4, attribution)).toMatchObject({ mainChange: "主要下降：actions concern", currentConcern: "当前关注问题：drill concern" })
  })
})
