import { describe, expect, it } from "vitest"
import { createOverviewDemoOutcomes } from "@/data/mock/overview-demo/overview-demo-data"
import { buildOverviewDemoScoreChanges } from "./overview-demo-detail-score"

const facts = { openActions: 0, openEvents: 0, submissionTotal: 0 }

describe("Overview Demo detail score decomposition", () => {
  it("calculates item point changes from the existing available-item denominator", () => {
    const previous = [{ storeId: "a", outcomes: createOverviewDemoOutcomes([]), operationalFacts: facts }]
    const current = [{ storeId: "a", outcomes: createOverviewDemoOutcomes(["actions", "certificateSafeDriving"]), operationalFacts: facts }]
    expect(buildOverviewDemoScoreChanges(current, previous)).toEqual([
      { key: "actions", label: "Actions", deltaPoints: -8.33, direction: "down" },
      { key: "certificateSafeDriving", label: "安全驾驶", deltaPoints: -8.33, direction: "down" },
    ])
  })

  it("does not invent item contributions when completeness changes", () => {
    const previous = [{ storeId: "a", outcomes: createOverviewDemoOutcomes([]), operationalFacts: facts }]
    const current = [{ storeId: "a", outcomes: createOverviewDemoOutcomes(["actions"], ["averageSubmissionsYtd"]), operationalFacts: facts }]
    expect(buildOverviewDemoScoreChanges(current, previous)).toEqual([])
  })
})
