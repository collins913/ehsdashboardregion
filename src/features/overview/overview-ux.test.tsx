import { areaScopeId } from "@/data/contracts/kpi";
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi"
import type { Month, StoreId } from "@/types/ehs"
import { OVERVIEW_V1_METRIC_CATALOG, createScoreContribution } from "@/lib/rules/overview-scoring"
import { prepareOverviewResult } from "./prepare-overview-result"
import { AttentionMatrix } from "./components/attention-matrix"
import { ManagementSummary } from "./components/management-summary"
import { DimensionScoreAccordion } from "./components/dimension-score-accordion"
import { ScopeSheet } from "./components/scope-detail-sheet"
import { ScoreChange } from "./components/score-change"
import { Sheet } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getOverviewPresentation, OverviewContent } from "./overview-page"
import { ChangeRankingList } from "./components/change-ranking-list"
import { OVERVIEW_SCORE_DOMAIN, OVERVIEW_SCORE_TICKS, OverviewMonthlyTrendChart } from "./components/overview-charts"

const stores: KpiStore[] = [
  { storeId: "a" as StoreId, displayName: "甲门店", region: "东区", area: "甲小区" },
  { storeId: "b" as StoreId, displayName: "乙门店", region: "东区", area: "甲小区" },
  { storeId: "c" as StoreId, displayName: "丙门店", region: "东区", area: "乙小区" },
  { storeId: "d" as StoreId, displayName: "丁门店", region: "西区", area: "丙小区" },
]
const months = ["2026-01", "2026-02", "2026-03", "2026-04"] as Month[]
const all: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } }
function prepare(scope = all, selected = stores, _start = "2026-03", _end = "2026-04", achieved: (store: KpiStore, month: Month, metricId: string) => boolean = () => true, referenceMonth = "2026-04" as Month) {
  return prepareOverviewResult({ referenceMonth, stores, selectedStores: selected, attentionStores: selected, requestedScope: scope,
    context: scope, availableMonths: months, sourceAvailability: "AVAILABLE",
    contributions: stores.flatMap((store) => months.flatMap((month) => OVERVIEW_V1_METRIC_CATALOG.map((metric) =>
      createScoreContribution({ ...metric, storeId: store.storeId, month, referenceDate: `${month}-28` }, achieved(store, month, metric.metricId))))) })
}
const result = prepare()
const markup = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(TooltipProvider, null, element))

describe("Overview UX semantics", () => {
  it.each([
    ["REGION", all, stores, ["东区", "西区"]],
    ["AREA", { ...all, region: { kind: "INCLUDE", values: ["东区"] } }, stores.slice(0, 3), ["甲小区", "乙小区"]],
    ["STORE", { ...all, area: { kind: "INCLUDE", values: [areaScopeId("东区", "甲小区")] } }, stores.slice(0, 2), ["甲门店", "乙门店"]],
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
    expect(view.dimensionScores.reduce((sum, dimension) => sum + dimension.totalPoints, 0)).toBe(4 * 12)
  })

  it("uses the current business month and compares with the previous natural month", () => {
    const view = prepare(all, stores, "2026-03", "2026-04", (_store, month) => month >= "2026-03")
    expect(view.currentPeriodLabel).toBe("2026-04")
    expect(view.previousPeriodLabel).toBe("2026-03")
    expect(view.hero.monthlyDelta).toBe(0)
    expect(view.dimensionScores[0].delta).toBe(0)
    const text = markup(createElement(ManagementSummary, { hero: view.hero, comparisonLabel: `比较期：${view.previousPeriodLabel}` }))
    expect(text).toContain("较上月")
    const detail = markup(createElement(Sheet, null, createElement(ScopeSheet, { detail: view.scopeDetails[0], currentPeriodLabel: view.currentPeriodLabel, comparisonPeriodLabel: view.previousPeriodLabel })))
    expect(detail).toContain("当前期：2026-04")
    expect(detail).toContain("比较期：2026-03")
    expect(detail).toContain("较上月")
    expect(detail).toContain("趋势")
  })

  it("uses percent notation for rate differences and unitless point cells", () => {
    expect(markup(createElement(ScoreChange, { value: 8.3 }))).toContain("+8.3%")
    expect(markup(createElement(ScoreChange, { value: -8.3 }))).toContain("-8.3%")
    expect(markup(createElement(ScoreChange, { value: 0 }))).toContain("0%")
    expect(markup(createElement(ScoreChange, { value: null }))).not.toContain(">0%</span>")
    expect(markup(createElement(ScoreChange, { value: 2, suffix: "" }))).toContain(">+2</span>")
  })

  it("keeps empty ranking slots without inventing values when comparison history is unavailable", () => {
    const view = prepare(all, stores, "2026-01", "2026-01", () => true, "2026-01" as Month)
    expect(view.currentPeriodLabel).toBe("2026-01")
    expect(view.previousPeriodLabel).toBe("无可比较历史")
    expect(view.hero.monthlyDelta).toBeNull()
    expect(view.attentionMatrix.groups).toEqual([])
    expect(view.comparisons.every((row) => row.delta === null && row.pointDelta === null)).toBe(true)
    const summary = markup(createElement(ManagementSummary, { hero: view.hero, comparisonLabel: view.previousPeriodLabel }))
    expect(summary).toContain("暂无月度比较")
    expect(summary).toContain("无可比较数据")
    expect(summary).toContain('data-testid="change-ranking-list"')
    const matrix = markup(createElement(AttentionMatrix, { matrix: view.attentionMatrix, onSelect: () => {}, comparisonLabel: view.previousPeriodLabel }))
    expect(matrix).toContain("无可比较数据")
    expect(matrix).not.toContain('data-detail-trigger="matrix"')
    expect(matrix).toContain("同级平均得分率 —")
  })

  it("does not turn unavailable current data or an unscored dimension into zero deltas", () => {
    const view = prepare(all, stores, "2026-05", "2026-05", () => true, "2026-05" as Month)
    expect(view.hero.overallScore).toBeNull()
    expect(view.hero.monthlyDelta).toBeNull()
    expect(view.comparisons.every((row) => row.delta === null && row.pointDelta === null)).toBe(true)
    expect(view.scopeDetails.every((detail) => detail.dimensionScores.every((dimension) => dimension.delta === null))).toBe(true)
    expect(result.scopeDetails.every((detail) => detail.dimensionScores.find((dimension) => dimension.id === "ENVIRONMENT")?.delta === null)).toBe(true)
  })

  it("zooms matrix domains for concentrated values while preserving real coordinates", () => {
    const earned = { a: [6, 7], b: [7, 7], c: [5, 5], d: [6, 6] } as const
    const view = prepare(all, stores, "2026-03", "2026-04", (store, month, metricId) => {
      const metricIndex = OVERVIEW_V1_METRIC_CATALOG.findIndex((metric) => metric.metricId === metricId)
      const slots = earned[store.storeId as keyof typeof earned]
      return metricIndex < slots[month === "2026-04" ? 1 : 0]
    })
    const scores = view.attentionMatrix.groups.map((group) => group.score)
    expect(view.attentionMatrix.xDomain[0]).toBeGreaterThan(0)
    expect(view.attentionMatrix.xDomain[1]).toBeLessThan(100)
    expect(view.attentionMatrix.xDomain[0]).toBeLessThan(Math.min(...scores))
    expect(view.attentionMatrix.xDomain[1]).toBeGreaterThan(Math.max(...scores))
    expect(scores).toContain(50)
    expect(scores).toContain(52.77777777777778)
  })

  it("keeps the business score bounds and pads extreme comparison values", () => {
    const view = prepare({ ...all, region: { kind: "INCLUDE", values: ["东区"] } }, stores, "2026-03", "2026-04", (store, month) => {
      if (store.storeId === "a" || store.storeId === "b") return month === "2026-04"
      return month !== "2026-04"
    })
    expect(view.attentionMatrix.xDomain).toEqual([0, 100])
    expect(view.attentionMatrix.yDomain[0]).toBeLessThan(-100)
    expect(view.attentionMatrix.yDomain[1]).toBeGreaterThan(100)
    expect(view.attentionMatrix.groups.map((group) => group.score)).toEqual(expect.arrayContaining([0, 100]))
    expect(view.attentionMatrix.groups.map((group) => group.delta)).toEqual(expect.arrayContaining([-100, 100]))
  })

  it("keeps single-point zero-change domains visible and does not jitter overlapping objects", () => {
    const one = prepare(all, [stores[0]])
    expect(one.attentionMatrix.groups).toHaveLength(1)
    expect(one.attentionMatrix.groups[0]).toMatchObject({ score: 100, delta: 0, count: 1 })
    expect(one.attentionMatrix.xDomain[0]).toBeLessThan(100)
    expect(one.attentionMatrix.xDomain[1]).toBe(100)
    expect(one.attentionMatrix.yDomain[0]).toBeLessThan(0)
    expect(one.attentionMatrix.yDomain[1]).toBeGreaterThan(0)

    const overlapping = prepare(all, stores)
    expect(overlapping.attentionMatrix.groups).toHaveLength(1)
    expect(overlapping.attentionMatrix.groups[0]).toMatchObject({ score: 100, delta: 0, count: 2 })
  })

  it("expresses Environment as unscored in both overview and detail presentations", () => {
    for (const scores of [result.dimensionScores, result.scopeDetails[0].dimensionScores]) {
      const text = markup(createElement(DimensionScoreAccordion, { scores: scores.filter((dimension) => dimension.id === "ENVIRONMENT"), storeCount: 4, showAverage: false, identity: "scope" }))
      expect(text).toContain("未纳入评分")
      expect(text).not.toContain(">0%</span>")
      expect(text).not.toContain("—")
    }
  })

  it("uses the resolved result for refresh and Skeleton only before any result exists", () => {
    expect(getOverviewPresentation({ status: "LOADING", resolved: null })).toBeNull()
    expect(getOverviewPresentation({ status: "LOADING", resolved: { key: "old", data: result } })).toEqual({ result, semanticKey: "old", refreshing: true })
    expect(getOverviewPresentation({ status: "SUCCESS", data: result, resolved: { key: "new", data: result } })).toEqual({ result, semanticKey: "new", refreshing: false })
    expect(getOverviewPresentation({ status: "ERROR", resolved: { key: "old", data: result } })).toBeNull()
  })

  it("keeps prepared ranking order and null values with non-interactive empty places", () => {
    const text = markup(createElement(ChangeRankingList, {
      improving: [
        { scopeId: "b", label: "乙门店", score: 80, delta: 5.4 },
        { scopeId: "a", label: "甲门店", score: null, delta: null },
      ], declining: [], onSelect: () => {},
    }))
    expect(text.indexOf("查看乙门店提升第1名详情")).toBeLessThan(text.indexOf("查看甲门店提升第2名详情"))
    expect(text).toContain("80%")
    expect(text).toContain("+5.4%")
    expect(text).toContain("退步第1位暂无对象")
    expect(text).toContain("提升第3位暂无对象")
    expect(text).toContain("—")
    expect(text).not.toContain(">0%</span>")
    expect(text).not.toContain("第3名详情")
  })

  it("defaults to the matrix even for a small set of overlapping peers", () => {
    const matrix = { groups: [{ id: "same", level: "STORE" as const, count: 3, score: 37.25, delta: -1.25,
      members: [{ id: "a", label: "甲门店" }, { id: "b", label: "乙门店" }, { id: "c", label: "丙门店" }] }],
      xDomain: [0, 100] as const, yDomain: [-5, 5] as const, averageScore: 37.25 }
    const text = markup(createElement(AttentionMatrix, { matrix, comparisonLabel: "比较期：2026-09", onSelect: () => {}, selectedScopeId: "b" }))
    expect(text).not.toContain("门店比较 · 3 家门店")
    expect(text).toContain("同级平均得分率 37.3%")
    expect(text).toContain('data-state="active"')
    expect(text).toContain('data-detail-trigger="matrix"')
    expect(text).toContain('aria-selected="true"')
    expect(text.indexOf('>矩阵</button>')).toBeLessThan(text.indexOf('>明细</button>'))
    expect(matrix.groups[0].members).toHaveLength(3)
  })

  it("keeps the trend viewport for sparse history without converting unknown scores to zero", () => {
    expect(OVERVIEW_SCORE_DOMAIN).toEqual([0, 100])
    expect(OVERVIEW_SCORE_TICKS).toEqual([0, 25, 50, 75, 100])
    expect(markup(createElement(OverviewMonthlyTrendChart, { history: [] }))).toBe("")
    for (const history of [[{ periodLabel: "2026-10", score: 0 }], [{ periodLabel: "2026-09", score: null }, { periodLabel: "2026-10", score: 100 }]]) {
      expect(markup(createElement(OverviewMonthlyTrendChart, { history }))).toContain('data-testid="monthly-score-trend"')
    }
  })

  it("keeps the current-month hero and a continuous 12-month window independent of the selected period", () => {
    const achieved = (_store: KpiStore, month: Month) => month === "2026-04"
    const views = [["2026-01", "2026-04"], ["2026-03", "2026-04"], ["2026-04", "2026-04"], ["2026-01", "2026-01"]]
      .map(([start, end]) => prepare(all, stores, start, end, achieved))
    for (const view of views) {
      expect(view.hero.overallScore).toBe(100)
      expect(view.hero.scoreMonth).toBe("2026-04")
      expect(view.hero.monthlyDelta).toBe(100)
      expect(view.hero.monthlyScoreHistory).toEqual(views[0].hero.monthlyScoreHistory)
      expect(view.hero.monthlyScoreHistory).toHaveLength(4)
      expect(view.hero.monthlyScoreHistory[0]).toEqual({ periodLabel: "2026-01", score: 0 })
      expect(view.hero.monthlyScoreHistory.at(-1)).toEqual({ periodLabel: "2026-04", score: 100 })
      for (const detail of view.scopeDetails) expect(detail.monthlyHistory).toEqual(view.hero.monthlyScoreHistory)
    }
    expect(views.map((view) => view.comparisons[0].score)).toEqual([100, 100, 100, 100])
    expect(prepare(all, [stores[0]], "2026-01", "2026-01", (store) => store.storeId !== "a").hero.overallScore).toBe(0)
  })

  it("shows selected periods only in the scope bar and keeps detail captions free of repetition", () => {
    const page = markup(createElement(OverviewContent, { result }))
    expect(page.match(/当前期：/g)).toHaveLength(1)
    expect(page.match(/比较期：2026-03/g)).toHaveLength(1)
    const detail = markup(createElement(Sheet, null, createElement(ScopeSheet, { detail: result.scopeDetails[0] })))
    expect(detail).not.toContain("当前期：")
    expect(detail).not.toContain("比较期：")
    expect(detail).not.toContain("最新月")
    expect(detail).toContain("趋势")
    expect(detail).not.toContain("近 12 个月")
    expect(detail).toContain('data-testid="monthly-score-trend"')
  })
})
