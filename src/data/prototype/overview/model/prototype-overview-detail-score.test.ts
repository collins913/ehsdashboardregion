import { describe, expect, it } from "vitest"
import { createPrototypeOverviewOutcomes } from "@/data/mock/overview-demo/overview-demo-data"
import { buildPrototypeOverviewScoreChanges } from "./prototype-overview-detail-score"

const facts = { openActions: 0, openEvents: 0, submissionTotal: 0 }

describe("Overview Demo detail score decomposition", () => {
  it("calculates item point changes from the existing available-item denominator", () => {
    const previous = [{ storeId: "a", outcomes: createPrototypeOverviewOutcomes([]), operationalFacts: facts }]
    const current = [{ storeId: "a", outcomes: createPrototypeOverviewOutcomes(["actions", "certificateSafeDriving"]), operationalFacts: facts }]
    expect(buildPrototypeOverviewScoreChanges(current, previous)).toEqual([
      { key: "actions", label: "Actions", deltaPoints: -8.3, direction: "down" },
      { key: "certificateSafeDriving", label: "安全驾驶", deltaPoints: -8.3, direction: "down" },
    ])
  })

  it("does not invent item contributions when completeness changes", () => {
    const previous = [{ storeId: "a", outcomes: createPrototypeOverviewOutcomes([]), operationalFacts: facts }]
    const current = [{ storeId: "a", outcomes: createPrototypeOverviewOutcomes(["actions"], ["averageSubmissionsYtd"]), operationalFacts: facts }]
    expect(buildPrototypeOverviewScoreChanges(current, previous)).toEqual([])
  })
})
