import { describe, expect, it } from "vitest"
import { rankPrototypeOverviewMovements, selectPrototypeOverviewDeltaExtrema, type PrototypeOverviewComparableScope } from "./prototype-overview-movements"

const scope = (id: string, delta: number): PrototypeOverviewComparableScope => ({ id, name: id, current: 80 + delta, previous: 80, currentCompleteness: 100, previousCompleteness: 100 })

describe("Overview deterministic delta extrema", () => {
  it("prepares independent Top 3 lists in both directions with stable ties", () => {
    const areas = rankPrototypeOverviewMovements([scope("d", -1), scope("b", 5), scope("a", 5), scope("c", 2)])
    const stores = rankPrototypeOverviewMovements([scope("x", 1), scope("y", -9), scope("z", 3)])
    expect(areas.improving.map((item) => item.id)).toEqual(["a", "b", "c"])
    expect(areas.declining.map((item) => item.id)).toEqual(["d"])
    expect(stores.declining.map((item) => item.id)).toEqual(["y"])
    expect(rankPrototypeOverviewMovements([])).toEqual({ improving: [], declining: [] })
    expect(rankPrototypeOverviewMovements([scope("valid", 0), { ...scope("missing", 20), previous: null }]))
      .toMatchObject({ improving: [{ id: "valid", delta: 0 }], declining: [] })
  })
  it("selects the maximum Area delta and minimum Store delta", () => {
    expect(selectPrototypeOverviewDeltaExtrema([scope("a", 2), scope("b", 5), scope("c", -1)]).improving).toMatchObject({ id: "b", delta: 5 })
    expect(selectPrototypeOverviewDeltaExtrema([scope("a", 1), scope("b", -9), scope("c", 3)]).declining).toMatchObject({ id: "b", delta: -9 })
  })
  it("breaks improving ties by canonical id independently of insertion order", () => {
    for (const candidates of [[scope("b", 5), scope("a", 5)], [scope("a", 5), scope("b", 5)]]) {
      const result = selectPrototypeOverviewDeltaExtrema(candidates)
      expect(result.improving?.id).toBe("a")
      expect(result.declining).toBeNull()
    }
  })
  it("excludes missing, incomplete and non-finite results without coercing them to zero", () => {
    const invalid = [
      { ...scope("missing", 20), previous: null },
      { ...scope("current", 20), current: null },
      { ...scope("incomplete", 20), currentCompleteness: 90 },
      { ...scope("previous-incomplete", 20), previousCompleteness: 90 },
      { ...scope("invalid", 20), current: Number.NaN },
    ]
    expect(selectPrototypeOverviewDeltaExtrema(invalid)).toEqual({ improving: null, declining: null })
    expect(selectPrototypeOverviewDeltaExtrema([...invalid, scope("valid", 2)]).improving?.id).toBe("valid")
  })
  it("requires the matching direction for numeric extrema", () => {
    expect(selectPrototypeOverviewDeltaExtrema([scope("a", -2), scope("b", -1)]).improving).toBeNull()
    expect(selectPrototypeOverviewDeltaExtrema([scope("a", 1), scope("b", 2)]).declining).toBeNull()
  })
})
