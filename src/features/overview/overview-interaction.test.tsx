import { beforeEach, describe, expect, it, vi } from "vitest"
import { createElement, isValidElement, type ReactElement } from "react"
import type { OverviewAttentionGroup, OverviewResult } from "@/data/contracts/overview"
import { OverviewContent, OverviewScopeSummary } from "./overview-page"
import { ManagementSummary } from "./components/management-summary"
import { ScopeDetailSheet } from "./components/scope-detail-sheet"
import { AttentionPointGroup } from "./components/overview-charts"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { SheetContent } from "@/components/ui/sheet"
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator"

// Reuse the project's controlled-hook testing approach; real DOM keyboard behavior is checked in the browser.
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }))
vi.mock("react-dom", async (original) => ({
  ...await original<typeof import("react-dom")>(),
  createPortal: (children: import("react").ReactNode) => createElement("div", { "data-summary-portal": true }, children),
}))
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => { const index = runtime.cursor++; return runtime.slots[index] ??= { current: initial } },
  useState: (initial: unknown) => {
    const index = runtime.cursor++
    if (!(index in runtime.slots)) runtime.slots[index] = initial
    return [runtime.slots[index], (next: unknown) => { runtime.slots[index] = next }]
  },
  useEffect: (effect: () => void, dependencies: unknown[]) => {
    const index = runtime.cursor++
    const previous = runtime.slots[index] as unknown[] | undefined
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
      runtime.slots[index] = dependencies
      runtime.effects.push(effect)
    }
  },
}))
function render(view: () => ReactElement) {
  runtime.cursor = 0
  const tree = view()
  runtime.effects.splice(0).forEach((effect) => effect())
  return tree
}
function nodes(tree: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!isValidElement<Record<string, unknown>>(tree)) return []
  return [tree, ...nodes(tree.props.children)]
}
function props(tree: ReactElement, type: unknown) {
  const found = nodes(tree).find((node) => node.type === type)
  if (!found) throw new Error("Expected component missing")
  return found.props
}
const detail = { id: "a", label: "甲门店", level: "STORE" as const, storeCount: 1, score: 50, monthlyDelta: null, monthlyHistory: [], dimensionScores: [] }
const result: OverviewResult = {
  availability: "AVAILABLE", stores: [], storeCount: 1, scopeLabel: "甲门店", currentPeriodLabel: "2026-01", previousPeriodLabel: "无可比较历史", periodNotice: "2026-01", scoreRuleVersion: "V1",
  hero: { scoreMonth: "2026-10", overallScore: 50, monthlyDelta: null, monthlyScoreHistory: [], improvingRanking: { areas: [], stores: [] }, decliningRanking: { areas: [], stores: [] } },
  attentionMatrix: { groups: [], xDomain: [0, 100], yDomain: [-2, 2], averageScore: null }, dimensionScores: [], comparisons: [], scopeDetails: [detail],
}
class Trigger {
  isConnected = true
  focus = vi.fn()
  closest = vi.fn(() => null)
}
let trigger: Trigger
beforeEach(() => {
  runtime.slots = []; runtime.cursor = 0; runtime.effects = []
  trigger = new Trigger()
  vi.stubGlobal("HTMLElement", Trigger)
  vi.stubGlobal("document", { activeElement: trigger })
})

function selectScope(tree: ReactElement, id = "a") { (props(tree, ManagementSummary).onSelect as (id: string) => void)(id) }
function sheetDetail(tree: ReactElement) { return props(tree, ScopeDetailSheet).detail }

describe("Overview detail and refresh lifecycle", () => {
  it("renders only the matching resolved summary in the shared header slot", () => {
    const summaryTarget = {} as HTMLDivElement
    const current = render(() => OverviewContent({ result, semanticKey: "A", summaryTarget }))
    expect(props(current, OverviewScopeSummary).result).toBe(result)
    for (const state of [{ requestedKey: "B" }, { refreshing: true }, { summaryTarget: null }]) {
      const tree = render(() => OverviewContent({ result, semanticKey: "A", summaryTarget, ...state }))
      expect(nodes(tree).some((node) => node.type === OverviewScopeSummary)).toBe(false)
    }
    const next = { ...result, scopeLabel: "乙门店" }
    const resolved = render(() => OverviewContent({ result: next, semanticKey: "B", requestedKey: "B", summaryTarget }))
    expect(props(resolved, OverviewScopeSummary).result).toBe(next)
  })
  it.each(["scope", "period"])("closes the old detail synchronously on a requested %s change, before the new response", (change) => {
    let requestedKey = "A", semanticKey = "A", refreshing = false
    const view = () => OverviewContent({ result, requestedKey, semanticKey, refreshing })
    selectScope(render(view))
    expect(sheetDetail(render(view))).toMatchObject({ value: detail })
    requestedKey = change
    expect(sheetDetail(render(view))).toBeNull()
    refreshing = true
    const pending = render(view)
    expect(sheetDetail(pending)).toBeNull()
    expect(props(pending, AnalyticsRefreshIndicator).refreshing).toBe(true)
    expect(nodes(pending).some((node) => node.props.inert === true)).toBe(true)
    selectScope(pending)
    semanticKey = requestedKey; refreshing = false
    expect(sheetDetail(render(view))).toBeNull()
  })

  it("closes detail during same-key refresh and does not reopen it afterward", () => {
    let refreshing = false
    const view = () => OverviewContent({ result, semanticKey: "A", refreshing })
    selectScope(render(view)); expect(sheetDetail(render(view))).not.toBeNull()
    refreshing = true; expect(sheetDetail(render(view))).toBeNull()
    refreshing = false; expect(sheetDetail(render(view))).toBeNull()
  })

  it("reads detail from the current result and ignores nonexistent entity IDs", () => {
    let current = result
    const view = () => OverviewContent({ result: current, semanticKey: "A" })
    selectScope(render(view), "missing"); expect(sheetDetail(render(view))).toBeNull()
    selectScope(render(view))
    current = { ...result, scopeDetails: [{ ...detail, score: 75 }] }
    expect(sheetDetail(render(view))).toMatchObject({ value: { score: 75 } })
    expect(props(render(view), ScopeDetailSheet).returnFocusTarget).toBe(trigger)
  })
})

const group: OverviewAttentionGroup = { id: "coordinate", level: "STORE", count: 2, score: 50, delta: 5,
  members: [{ id: "a", label: "甲门店" }, { id: "b", label: "乙门店" }] }
describe("Matrix member interaction", () => {
  it.each([["STORE", "家门店"], ["AREA", "个小区"], ["REGION", "个区域"]] as const)("labels overlapping %s objects accurately", (level, unit) => {
    const tree = render(() => AttentionPointGroup({ cx: 10, cy: 10, payload: { ...group, level }, onSelect: vi.fn() })!)
    expect(props(tree, "button")["aria-label"]).toContain(`共 2 ${unit}`)
    expect(props(tree, "button")["aria-label"]).toContain("50%")
    expect(props(tree, "button")["aria-label"]).toContain("5%")
  })

  it("opens a single entity through a native button", () => {
    const onSelect = vi.fn()
    const tree = render(() => AttentionPointGroup({ cx: 10, cy: 10, payload: { ...group, count: 1, members: group.members.slice(0, 1) }, onSelect })!)
    expect(nodes(tree).some((node) => node.type === DropdownMenu)).toBe(false)
    ;(props(tree, "button").onClick as () => void)()
    expect(onSelect).toHaveBeenCalledWith("a")
  })

  it("passes the original menu trigger to detail and prevents menu focus stealing", () => {
    const selected: string[] = []
    const view = () => AttentionPointGroup({ cx: 10, cy: 10, payload: group, onSelect: (id, origin) => { expect(origin).toBe(trigger); selected.push(id) } })!
    const tree = render(view)
    ;(props(tree, "button").ref as { current: unknown }).current = trigger
    ;(props(tree, DropdownMenu).onOpenChange as (open: boolean) => void)(true)
    const open = render(view)
    expect(props(open, DropdownMenu).open).toBe(true)
    const items = nodes(open).filter((node) => node.type === DropdownMenuItem)
    ;(items[1].props.onSelect as () => void)()
    expect(selected).toEqual(["b"])
    expect(props(render(view), DropdownMenu).open).toBe(false)
    const event = { preventDefault: vi.fn() }
    ;(props(open, DropdownMenuContent).onCloseAutoFocus as (event: unknown) => void)(event)
    expect(event.preventDefault).toHaveBeenCalled()
  })
})

describe("Detail focus lifecycle", () => {
  it("focuses the Sheet and returns to the original connected trigger on close", () => {
    const tree = render(() => ScopeDetailSheet({ detail: { kind: "scope", value: detail }, onClose: vi.fn(), returnFocusTarget: trigger as unknown as HTMLElement }))
    const content = props(tree, SheetContent)
    const focus = vi.fn()
    ;(content.ref as { current: unknown }).current = { focus }
    const event = { preventDefault: vi.fn() }
    ;(content.onOpenAutoFocus as (event: unknown) => void)(event)
    expect(focus).toHaveBeenCalled()
    ;(content.onCloseAutoFocus as (event: unknown) => void)(event)
    expect(trigger.focus).toHaveBeenCalled()
    trigger.isConnected = false; trigger.focus.mockClear()
    ;(content.onCloseAutoFocus as (event: unknown) => void)(event)
    expect(trigger.focus).not.toHaveBeenCalled()
  })
})
