import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi"
import { periodFromMonthRange } from "@/data/contracts/kpi-period"
import type { Month, StoreId } from "@/types/ehs"
import { OVERVIEW_V1_METRIC_CATALOG, createScoreContribution } from "@/lib/rules/overview-scoring"
import { prepareOverviewResult } from "./prepare-overview-result"
import { AttentionMatrix } from "./components/attention-matrix"
import { ManagementSummary, monthlyComparisonLabel } from "./components/management-summary"
import { DimensionScoreAccordion } from "./components/dimension-score-accordion"
import { ScopeSheet } from "./components/scope-detail-sheet"
import { ScoreChange } from "./components/score-change"
import { Sheet } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getOverviewPresentation } from "./overview-page"

const stores: KpiStore[] = [
  { storeId: "a" as StoreId, displayName: "甲门店", region: "东区", area: "甲小区" },
  { storeId: "b" as StoreId, displayName: "乙门店", region: "东区", area: "甲小区" },
  { storeId: "c" as StoreId, displayName: "丙门店", region: "东区", area: "乙小区" },
  { storeId: "d" as StoreId, displayName: "丁门店", region: "西区", area: "丙小区" },
]
const months = ["2026-01", "2026-02", "2026-03", "2026-04"] as Month[]
const all: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } }
function prepare(scope = all, selected = stores, start = "2026-03", end = "2026-04", achieved = (_store: KpiStore, _month: Month) => true) {
  return prepareOverviewResult({ stores, selectedStores: selected, attentionStores: selected, requestedScope: scope,
    context: { ...scope, period: periodFromMonthRange(start as Month, end as Month)! }, availableMonths: months, sourceAvailability: "AVAILABLE",
    contributions: stores.flatMap((store) => months.flatMap((month) => OVERVIEW_V1_METRIC_CATALOG.map((metric) =>
      createScoreContribution({ ...metric, storeId: store.storeId, month, referenceDate: `${month}-28` }, achieved(store, month))))) })
}
const result = prepare()
const markup = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(TooltipProvider, null, element))

describe("Overview UX semantics", () => {
  it.each([
    ["REGION", all, stores, ["东区", "西区"]],
    ["AREA", { ...all, region: { kind: "INCLUDE", values: ["东区"] } }, stores.slice(0, 3), ["甲小区", "乙小区"]],
    ["STORE", { ...all, area: { kind: "INCLUDE", values: ["甲小区"] } }, stores.slice(0, 2), ["甲门店", "乙门店"]],
  ] as const)("groups actual %s objects sharing coordinates and opens their own details", (level, scope, selected, labels) => {
    const view = prepare(scope as EhsStoreScope, [...selected])
    expect(view.attentionMatrix.groups).toHaveLength(1)
    const point = view.attentionMatrix.groups[0]
    expect(point).toMatchObject({ level, count: labels.length, score: 100, delta: 0 })
    expect(point.members.map((member) => member.label)).toEqual(labels)
    for (const member of point.members) expect(view.scopeDetails.find((detail) => detail.id === member.id)).toMatchObject({ level, score: 100 })
  })

  it("preserves the existing object mean after merging overlapping coordinates", () => {
    const scope: EhsStoreScope = { ...all, store: { kind: "INCLUDE", values: stores.map((store) => store.storeId) as [StoreId, ...StoreId[]] } }
    const view = prepare(scope, stores, "2026-03", "2026-04", (store) => store.storeId !== "d")
    expect(view.attentionMatrix.groups.map((group) => group.count)).toEqual([3, 1])
    expect(view.attentionMatrix.averageScore).toBe(75)
    expect(view.dimensionScores.reduce((sum, dimension) => sum + dimension.totalPoints, 0)).toBe(4 * 2 * 12)
  })

  it("keeps monthly and period comparison labels aligned with distinct actual deltas", () => {
    const view = prepare(all, stores, "2026-03", "2026-04", (_store, month) => month >= "2026-03")
    expect(view.previousPeriodLabel).toBe("2026-01 至 2026-02")
    expect(view.hero.monthlyDelta).toBe(0)
    expect(view.dimensionScores[0].delta).toBe(100)
    const text = markup(createElement(ManagementSummary, { hero: view.hero, comparisonLabel: `比较期：${view.previousPeriodLabel}` }))
    expect(text).toContain("最新月 2026-04 较 2026-03")
    expect(text).toContain("比较期：2026-01 至 2026-02")
    const detail = markup(createElement(Sheet, null, createElement(ScopeSheet, { detail: view.scopeDetails[0], currentPeriodLabel: view.currentPeriodLabel, comparisonLabel: `比较期：${view.previousPeriodLabel}` })))
    expect(detail).toContain("2026-03 至 2026-04")
    expect(detail).toContain("比较期：2026-01 至 2026-02")
    expect(detail).not.toContain("较上月")
  })

  it("uses percentage points for rate deltas, raw points only with an explicit suffix", () => {
    expect(markup(createElement(ScoreChange, { value: 8.3 }))).toContain("+8.3 pp")
    expect(markup(createElement(ScoreChange, { value: -8.3 }))).toContain("-8.3 pp")
    expect(markup(createElement(ScoreChange, { value: 0 }))).toContain("0 pp")
    expect(markup(createElement(ScoreChange, { value: null }))).not.toContain("0 pp")
    expect(markup(createElement(ScoreChange, { value: 2, suffix: " 分" }))).toContain("+2 分")
  })

  it("does not draw an empty podium or matrix when comparison history is unavailable", () => {
    const view = prepare(all, stores, "2026-01", "2026-01")
    expect(view.hero.monthlyDelta).toBeNull()
    expect(view.attentionMatrix.groups).toEqual([])
    expect(view.comparisons.every((row) => row.delta === null && row.pointDelta === null)).toBe(true)
    const summary = markup(createElement(ManagementSummary, { hero: view.hero, comparisonLabel: view.previousPeriodLabel }))
    expect(summary).toContain("无可比较月度历史")
    expect(summary).toContain("无可比较数据")
    expect(summary).not.toContain('data-testid="change-ranking-podium"')
    const matrix = markup(createElement(AttentionMatrix, { matrix: view.attentionMatrix, onSelect: () => {}, comparisonLabel: view.previousPeriodLabel }))
    expect(matrix).toContain("无可比较数据")
    expect(matrix).not.toContain('data-detail-trigger="matrix"')
    expect(matrix).not.toContain("同级平均")
  })

  it("does not turn unavailable current data or an unscored dimension into zero deltas", () => {
    const view = prepare(all, stores, "2026-05", "2026-05")
    expect(view.hero.overallScore).toBeNull()
    expect(view.hero.monthlyDelta).toBeNull()
    expect(view.comparisons.every((row) => row.delta === null && row.pointDelta === null)).toBe(true)
    expect(view.scopeDetails.every((detail) => detail.dimensionScores.every((dimension) => dimension.delta === null))).toBe(true)
    expect(result.scopeDetails.every((detail) => detail.dimensionScores.find((dimension) => dimension.id === "ENVIRONMENT")?.delta === null)).toBe(true)
  })

  it("expresses Environment as unscored in both overview and detail presentations", () => {
    for (const scores of [result.dimensionScores, result.scopeDetails[0].dimensionScores]) {
      const text = markup(createElement(DimensionScoreAccordion, { scores: scores.filter((dimension) => dimension.id === "ENVIRONMENT"), storeCount: 4, showAverage: false, identity: "scope", comparisonLabel: "比较期：2026-01 至 2026-02" }))
      expect(text).toContain("未纳入评分")
      expect(text).not.toContain("0 pp")
      expect(text).not.toContain("—")
    }
  })

  it("keeps monthly comparison unavailable across a missing previous month", () => {
    expect(monthlyComparisonLabel([{ periodLabel: "2026-01", score: 50 }], null)).toBe("无可比较月度历史")
    expect(monthlyComparisonLabel([{ periodLabel: "2026-01", score: 50 }], 5)).toBe("最新月 2026-01 较 2025-12")
  })

  it("uses the resolved result for refresh and Skeleton only before any result exists", () => {
    expect(getOverviewPresentation({ status: "LOADING", resolved: null })).toBeNull()
    expect(getOverviewPresentation({ status: "LOADING", resolved: { key: "old", data: result } })).toEqual({ result, semanticKey: "old", refreshing: true })
    expect(getOverviewPresentation({ status: "SUCCESS", data: result, resolved: { key: "new", data: result } })).toEqual({ result, semanticKey: "new", refreshing: false })
    expect(getOverviewPresentation({ status: "ERROR", resolved: { key: "old", data: result } })).toBeNull()
  })
})
