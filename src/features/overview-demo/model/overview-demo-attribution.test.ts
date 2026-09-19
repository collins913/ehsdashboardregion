import { describe, expect, it } from "vitest"
import { createOverviewDemoOutcomes } from "@/data/mock/overview-demo/overview-demo-data"
import { buildOverviewDemoAttribution, classifyOverviewDemoTransition } from "./overview-demo-attribution"

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
})
