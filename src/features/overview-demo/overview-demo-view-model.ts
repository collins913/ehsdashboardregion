import type { KpiStore } from "@/data/contracts/kpi"
import type { GlobalFilterState } from "@/features/global-filters/global-filter-state"
import { getOverviewDemoFixture } from "./data/overview-demo-fixture-repository"
import { buildOverviewDemoAttribution, buildOverviewDemoScopeChangeSummary } from "./model/overview-demo-attribution"
import {
  averageOverviewDemoScore,
  buildOverviewDemoBenchmark,
  rankOverviewDemoScopes,
} from "./model/overview-demo-benchmark"
import { buildOverviewDemoExecutiveInsight } from "./model/overview-demo-insights"
import { buildOverviewDemoIssueIntelligence } from "./model/overview-demo-issues"
import { buildOverviewDemoPriorityInvestigations } from "./model/overview-demo-priority"
import { overviewDemoScoredItems, scoreDimensions, scoreStores } from "./model/overview-demo-score"
import { classifyOverviewDemoTrend, scoreDelta } from "./model/overview-demo-trend"
import type {
  OverviewDemoAttribution,
  OverviewDemoBusinessCta,
  OverviewDemoChartDomain,
  OverviewDemoDiagnosticDimension,
  OverviewDemoDimensionView,
  OverviewDemoDriverView,
  OverviewDemoHistoryPoint,
  OverviewDemoHero,
  OverviewDemoIssueView,
  OverviewDemoManagementFact,
  OverviewDemoOperationalFacts,
  OverviewDemoPriorityInvestigation,
  OverviewDemoScopeChangeItem,
  OverviewDemoScopeComparison,
  OverviewDemoScopeDetail,
  OverviewDemoScopeLevel,
  OverviewDemoStoreIdentity,
  OverviewDemoStoreSnapshot,
  OverviewDemoViewModel,
} from "./model/overview-demo-types"

const overviewDemoFixture = getOverviewDemoFixture()

export function buildOverviewDemoAttentionDomains(
  comparisons: readonly Pick<OverviewDemoScopeComparison, "score" | "delta">[],
): { xDomain: OverviewDemoChartDomain; yDomain: OverviewDemoChartDomain } {
  const scores = comparisons.map((item) => item.score).filter((value): value is number => value !== null)
  const deltas = comparisons.map((item) => item.delta).filter((value): value is number => value !== null)
  if (scores.length === 0) return { xDomain: [0, 100], yDomain: [-2, 2] }

  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const xPadding = 8
  const xDomain: OverviewDemoChartDomain = [
    Math.max(0, Math.floor(minScore - xPadding)),
    Math.min(100, Math.ceil(maxScore + xPadding)),
  ]

  if (deltas.length === 0) return { xDomain, yDomain: [-2, 2] }
  const minDelta = Math.min(...deltas)
  const maxDelta = Math.max(...deltas)
  const yPadding = Math.max(2, Math.ceil((maxDelta - minDelta) * 0.1))
  return {
    xDomain,
    yDomain: [Math.floor(Math.min(0, minDelta - yPadding)), Math.ceil(Math.max(0, maxDelta + yPadding))],
  }
}

function includes<T>(scope: { kind: "ALL" } | { kind: "INCLUDE"; values: readonly T[] }, value: T) {
  return scope.kind === "ALL" || scope.values.includes(value)
}

function scopedIdentities(stores: readonly KpiStore[], state: GlobalFilterState): readonly KpiStore[] {
  return stores.filter(
    (store) =>
      includes(state.region, store.region) &&
      includes(state.area, store.area) &&
      includes(state.store, store.storeId),
  )
}

function peerIdentities(stores: readonly KpiStore[], state: GlobalFilterState): readonly KpiStore[] {
  return stores.filter(
    (store) => includes(state.region, store.region) && includes(state.area, store.area),
  )
}

function storeIdentities(stores: readonly KpiStore[]): OverviewDemoStoreIdentity[] {
  return stores.map((store) => ({ storeId: store.storeId, storeLabel: store.displayName, area: store.area }))
}

function pickSnapshots(
  snapshots: readonly OverviewDemoStoreSnapshot[],
  identities: readonly KpiStore[],
): readonly OverviewDemoStoreSnapshot[] {
  const ids = new Set(identities.map((store) => store.storeId))
  return snapshots.filter((store) => ids.has(store.storeId))
}

function materializeSnapshots(
  templates: readonly OverviewDemoStoreSnapshot[],
  identities: readonly KpiStore[],
): readonly OverviewDemoStoreSnapshot[] {
  const positions = new Map<string, number>()
  const fallbackAreas = [...new Set(identities.map((store) => store.area))].sort()

  return identities.map((identity) => {
    const position = positions.get(identity.area) ?? 0
    positions.set(identity.area, position + 1)
    const scenarioIndex =
      overviewDemoFixture.areaScenarioIndex[identity.area] ?? Math.max(0, fallbackAreas.indexOf(identity.area)) % 6
    const templateIndex = scenarioIndex === 2 && position % 3 === 2 ? 10 : scenarioIndex * 2 + (position % 2)
    return { ...templates[templateIndex], storeId: identity.storeId }
  })
}

function factsFor(stores: readonly OverviewDemoStoreSnapshot[]): OverviewDemoOperationalFacts {
  return stores.reduce(
    (total, store) => ({
      openActions: total.openActions + store.operationalFacts.openActions,
      openEvents: total.openEvents + store.operationalFacts.openEvents,
      submissionTotal: total.submissionTotal + store.operationalFacts.submissionTotal,
    }),
    { openActions: 0, openEvents: 0, submissionTotal: 0 },
  )
}

function factSentences(stores: readonly OverviewDemoStoreSnapshot[]): string[] {
  const facts = factsFor(stores)
  return [
    `当前 Open Actions：${facts.openActions}`,
    `当前 Open Events：${facts.openEvents}`,
    `当前 Submission Total：${facts.submissionTotal}`,
  ]
}

function managementFacts(stores: readonly OverviewDemoStoreSnapshot[]): OverviewDemoManagementFact[] {
  const facts = factsFor(stores)
  return [
    { key: "OPEN_ACTIONS", label: "Open Actions", value: facts.openActions },
    { key: "OPEN_EVENTS", label: "Open Events", value: facts.openEvents },
    { key: "SUBMISSION_TOTAL", label: "Submission Total", value: facts.submissionTotal },
  ]
}

function businessCtas(primaryRouteTarget: string | null): OverviewDemoBusinessCta[] {
  const items: Omit<OverviewDemoBusinessCta, "isPrimary">[] = [
    { label: "KPI", routeTarget: "/performance/kpi" },
    { label: "行动项", routeTarget: "/risk/actions" },
    { label: "事件", routeTarget: "/risk/events" },
    { label: "证件", routeTarget: "/risk/certificates" },
    { label: "环境", routeTarget: "/risk/environment" },
  ]
  return items.map((item) => ({ ...item, isPrimary: item.routeTarget === primaryRouteTarget }))
}

function diagnosticDimensions(
  dimensions: readonly OverviewDemoDimensionView[],
  issues: readonly OverviewDemoIssueView[],
  priorityInvestigations: readonly OverviewDemoPriorityInvestigation[],
  attribution: OverviewDemoAttribution,
): OverviewDemoDiagnosticDimension[] {
  const issueByKey = new Map(issues.map((issue) => [issue.id, issue]))
  const declineKeys = new Set(attribution.declineDrivers.map((item) => item.metricKey))
  const priorityIndex = new Map(priorityInvestigations.map((item, index) => [item.issueKey, index]))

  return dimensions
    .map((dimension, dimensionIndex) => {
      const dimensionIssues = priorityInvestigations
        .filter((item) => item.dimension === dimension.id)
        .map((item) => {
          const issue = issueByKey.get(item.issueKey)!
          return {
            issueKey: item.issueKey,
            label: item.label,
            newCount: issue.newIssueCount,
            persistentCount: issue.persistentIssueCount,
            recoveredCount: issue.recoveredCount,
            isDeclineDriver: declineKeys.has(item.issueKey),
            isSuggestedFirst: priorityIndex.get(item.issueKey) === 0,
            affectedStores: item.affectedStores,
            routeTarget: item.routeTarget,
          }
        })
      return {
        dimensionKey: dimension.id,
        dimensionLabel: dimension.label,
        score: dimension.score,
        delta: dimension.delta,
        isPriority: dimensionIssues.length > 0,
        issues: dimensionIssues,
        order: dimensionIssues.length > 0 ? Math.min(...dimensionIssues.map((item) => priorityIndex.get(item.issueKey) ?? 999)) : 999 + dimensionIndex,
      }
    })
    .sort((left, right) => left.order - right.order)
    .map(({ order: _order, ...dimension }) => dimension)
}

export function buildOverviewDemoScopeChanges(
  comparisons: readonly OverviewDemoScopeComparison[],
  label: "小区变化" | "门店变化",
) {
  const toItem = (item: OverviewDemoScopeComparison & { delta: number }): OverviewDemoScopeChangeItem => ({
    scopeId: item.id,
    scopeName: item.label,
    currentScore: item.score,
    delta: item.delta,
    primaryChangeLabel: item.mainChange,
    currentConcern: item.currentConcern,
    completeness: item.completeness,
  })
  const comparable = comparisons.filter((item): item is OverviewDemoScopeComparison & { delta: number } => item.delta !== null)
  const stable = (left: OverviewDemoScopeComparison, right: OverviewDemoScopeComparison) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  return {
    label,
    declining: [...comparable].filter((item) => item.delta < 0).sort((left, right) => left.delta - right.delta || stable(left, right)).slice(0, 5).map(toItem),
    improving: [...comparable].filter((item) => item.delta > 0).sort((left, right) => right.delta - left.delta || stable(left, right)).slice(0, 5).map(toItem),
  }
}

function dimensionViews(
  current: readonly OverviewDemoStoreSnapshot[],
  previous: readonly OverviewDemoStoreSnapshot[],
  attribution: OverviewDemoAttribution,
): OverviewDemoDimensionView[] {
  const previousScores = new Map(scoreDimensions(previous).map((dimension) => [dimension.id, dimension]))
  const views = scoreDimensions(current).map((dimension) => {
    const metrics = overviewDemoScoredItems.filter((item) => item.dimension === dimension.id)
    const items = metrics.map((metric) => {
      const passCount = current.filter((store) => store.outcomes[metric.id] === "PASS").length
      const previousPassCount = previous.filter((store) => store.outcomes[metric.id] === "PASS").length
      const count = (list: OverviewDemoAttribution["newIssues"]) =>
        list
          .filter((item) => item.metricKey === metric.id)
          .reduce((total, item) => total + item.affectedStores.length, 0)
      return {
        id: metric.id,
        label: metric.label,
        passCount,
        failCount: current.filter((store) => store.outcomes[metric.id] === "FAIL").length,
        availableCount: current.filter((store) => store.outcomes[metric.id] !== "MISSING").length,
        totalCount: current.length,
        previousPassCount,
        passDelta: passCount - previousPassCount,
        newIssueCount: count(attribution.newIssues),
        persistentIssueCount: count(attribution.persistentIssues),
        recoveredCount: count(attribution.recovered),
      }
    })
    const newDriver = attribution.newIssues.find((item) => item.dimension === dimension.id)
    const persistentDriver = attribution.persistentIssues.find((item) => item.dimension === dimension.id)
    const recoveredDriver = attribution.recovered.find((item) => item.dimension === dimension.id)
    const passStores = current.filter((store) => metrics.every((metric) => store.outcomes[metric.id] === "PASS")).length
    const failedStores = current.filter((store) => metrics.some((metric) => store.outcomes[metric.id] === "FAIL")).length
    const previousScore = previousScores.get(dimension.id)?.score ?? null
    const delta = scoreDelta(dimension.score, previousScore)

    return {
      id: dimension.id,
      label: dimension.label,
      score: dimension.score,
      previousScore,
      delta,
      completeness: dimension.completeness,
      passStores,
      totalStores: current.length,
      failCount: failedStores,
      newIssueCount: items.reduce((total, item) => total + item.newIssueCount, 0),
      recoveredCount: items.reduce((total, item) => total + item.recoveredCount, 0),
      primaryDrag: newDriver?.label ?? persistentDriver?.label ?? "未识别到主要短板",
      primaryImprovement: recoveredDriver?.label ?? "未识别到主要改善",
      explanation: `${dimension.label} 当前得分 ${dimension.score ?? "—"}，${delta === null ? "与上期不可比较" : delta > 0 ? `较上期提升 ${delta} 分` : delta < 0 ? `较上期下降 ${Math.abs(delta)} 分` : "较上期持平"}；${failedStores} 家门店存在当前问题。`,
      items,
      isTbd: false,
    }
  })

  return [
    ...views,
    {
      id: "ENVIRONMENT",
      label: "Environment",
      score: null,
      previousScore: null,
      delta: null,
      completeness: null,
      passStores: null,
      totalStores: current.length,
      failCount: null,
      newIssueCount: null,
      recoveredCount: null,
      primaryDrag: "TBD",
      primaryImprovement: "TBD",
      explanation: "评分与趋势口径待定义。",
      items: [],
      isTbd: true,
    },
  ]
}

function scopeLevel(state: GlobalFilterState): OverviewDemoScopeLevel {
  if (state.store.kind === "INCLUDE" && state.store.values.length === 1) return "STORE"
  if (state.area.kind === "INCLUDE" || state.store.kind === "INCLUDE") return "AREA"
  return "REGION"
}

type ScopeGroup = { id: string; label: string; level: "AREA" | "STORE"; stores: readonly KpiStore[] }

function groupIdentities(
  level: OverviewDemoScopeLevel,
  selected: readonly KpiStore[],
  peers: readonly KpiStore[],
): ScopeGroup[] {
  if (level === "AREA" || level === "STORE") {
    const source = level === "STORE" ? peers : selected
    return source.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }))
  }
  const areas = new Map<string, KpiStore[]>()
  for (const store of selected) areas.set(store.area, [...(areas.get(store.area) ?? []), store])
  return [...areas.entries()].map(([area, stores]) => ({ id: area, label: area, level: "AREA", stores }))
}

function scopeLabel(level: OverviewDemoScopeLevel, stores: readonly KpiStore[], state: GlobalFilterState): string {
  if (level === "STORE") return stores[0]?.displayName ?? "当前门店"
  if (state.store.kind === "INCLUDE") return `已选 ${stores.length} 家门店`
  if (level === "AREA") return state.area.kind === "INCLUDE" ? state.area.values[0] : "当前小区"
  return state.region.kind === "INCLUDE" ? state.region.values[0] : "全部区域"
}

function driverViews(items: OverviewDemoAttribution["newIssues"]): OverviewDemoDriverView[] {
  return items.slice(0, 4).map((item) => ({
    label: item.label,
    affectedCount: item.affectedStores.length,
    affectedAreas: item.affectedAreas.length,
    transition: item.transition,
  }))
}

function scopeComparison(
  group: ScopeGroup,
  currentAll: readonly OverviewDemoStoreSnapshot[],
  previousAll: readonly OverviewDemoStoreSnapshot[],
): OverviewDemoScopeComparison {
  const groupCurrent = pickSnapshots(currentAll, group.stores)
  const groupPrevious = pickSnapshots(previousAll, group.stores)
  const groupAttribution = buildOverviewDemoAttribution({
    current: groupCurrent,
    previous: groupPrevious,
    identities: storeIdentities(group.stores),
  })
  const score = scoreStores(groupCurrent)
  const previousScore = scoreStores(groupPrevious).score
  const delta = scoreDelta(score.score, previousScore)
  const changeSummary = buildOverviewDemoScopeChangeSummary(delta, groupAttribution)
  return {
    id: group.id,
    rank: null,
    label: group.label,
    level: group.level,
    score: score.score,
    previousScore,
    delta,
    completeness: score.completeness,
    storeCount: group.stores.length,
    mainChange: changeSummary.mainChange,
    currentConcern: changeSummary.currentConcern,
  }
}

function historyFor(
  stores: readonly KpiStore[],
  allStores: readonly KpiStore[],
): OverviewDemoHistoryPoint[] {
  return overviewDemoFixture.historyPeriods.map((period) => ({
    periodLabel: period.periodLabel,
    score: scoreStores(pickSnapshots(materializeSnapshots(period.stores, allStores), stores)).score,
  }))
}

function monthlyHistoryFor(
  stores: readonly KpiStore[],
  allStores: readonly KpiStore[],
): OverviewDemoHistoryPoint[] {
  return overviewDemoFixture.monthlyHistoryPeriods.map((period) => ({
    periodLabel: period.periodLabel,
    score: scoreStores(pickSnapshots(materializeSnapshots(period.stores, allStores), stores)).score,
  }))
}

function topChange(comparisons: readonly OverviewDemoScopeComparison[], direction: "IMPROVING" | "DECLINING") {
  const changes = buildOverviewDemoScopeChanges(comparisons, "小区变化")
  const item = direction === "IMPROVING" ? changes.improving[0] : changes.declining[0]
  return item ? { name: item.scopeName, delta: item.delta } : null
}

export function buildOverviewDemoPrimaryScoreLoss(current: readonly OverviewDemoStoreSnapshot[]): OverviewDemoHero["primaryScoreLoss"] {
  const losses = overviewDemoScoredItems.map((item) => ({
    label: item.issueLabel,
    affectedStores: current.filter((store) => store.outcomes[item.id] === "FAIL").length,
  }))
  const highest = losses.reduce<(typeof losses)[number] | null>(
    (best, item) => !best || item.affectedStores > best.affectedStores ? item : best,
    null,
  )
  return highest && highest.affectedStores > 0 ? highest : null
}

function periodModeLabel(state: GlobalFilterState): string {
  if (state.period.mode === "THIS_YEAR") return "本年"
  if (state.period.mode === "THIS_QUARTER") return "本季度"
  if (state.period.mode === "THIS_MONTH") return "本月"
  return "自定义周期"
}

export function buildOverviewDemoViewModel(
  canonicalStores: readonly KpiStore[],
  state: GlobalFilterState,
): OverviewDemoViewModel {
  const selected = scopedIdentities(canonicalStores, state)
  const peers = peerIdentities(canonicalStores, state)
  const level = scopeLevel(state)
  const currentAll = materializeSnapshots(overviewDemoFixture.currentStores, canonicalStores)
  const previousAll = materializeSnapshots(overviewDemoFixture.previousStores, canonicalStores)
  const current = pickSnapshots(currentAll, selected)
  const previous = pickSnapshots(previousAll, selected)
  const identities = storeIdentities(selected)
  const attribution = buildOverviewDemoAttribution({ current, previous, identities })
  const overall = scoreStores(current)
  const previousOverall = scoreStores(previous)
  const groups = groupIdentities(level, selected, peers)

  const rawComparisons = groups.map((group) => scopeComparison(group, currentAll, previousAll))
  const rankedComparisons = rankOverviewDemoScopes(rawComparisons)
  const parentLabel = level === "REGION" ? scopeLabel(level, selected, state) : selected[0]?.area ?? "当前小区"
  const buildScopeDetail = (
    group: ScopeGroup,
    peerComparisons: readonly OverviewDemoScopeComparison[],
    benchmarkLabel: string,
    scopeChanges: OverviewDemoScopeDetail["scopeChanges"],
  ): OverviewDemoScopeDetail => {
    const groupCurrent = pickSnapshots(currentAll, group.stores)
    const groupPrevious = pickSnapshots(previousAll, group.stores)
    const groupIdentitiesForModel = storeIdentities(group.stores)
    const groupAttribution = buildOverviewDemoAttribution({
      current: groupCurrent,
      previous: groupPrevious,
      identities: groupIdentitiesForModel,
    })
    const score = scoreStores(groupCurrent)
    const comparison = peerComparisons.find((item) => item.id === group.id)
    const issues = buildOverviewDemoIssueIntelligence({
      current: groupCurrent,
      previous: groupPrevious,
      identities: groupIdentitiesForModel,
      attribution: groupAttribution,
    })
    const priorityInvestigations = buildOverviewDemoPriorityInvestigations({
      issues,
      attribution: groupAttribution,
    })
    const dimensions = dimensionViews(groupCurrent, groupPrevious, groupAttribution)
    const diagnostics = diagnosticDimensions(dimensions, issues, priorityInvestigations, groupAttribution)
    const priorityDimension = diagnostics.find((dimension) => dimension.isPriority)
    const history = historyFor(group.stores, canonicalStores)
    return {
      id: group.id,
      label: group.label,
      level: group.level,
      summary: priorityDimension
        ? `当前仍有 ${priorityDimension.issues.length} 类 ${priorityDimension.dimensionLabel} 问题需要关注。`
        : "当前未识别到重点问题。",
      score: score.score,
      previousScore: scoreStores(groupPrevious).score,
      delta: comparison?.delta ?? null,
      completeness: score.completeness,
      benchmark: buildOverviewDemoBenchmark({ id: group.id, parentLabel: benchmarkLabel, comparisons: peerComparisons }),
      history,
      trendLabel: classifyOverviewDemoTrend(history),
      diagnostics,
      changeSummary: {
        newIssues: driverViews(groupAttribution.newIssues),
        persistentIssues: driverViews(groupAttribution.persistentIssues),
        recovered: driverViews(groupAttribution.recovered),
      },
      scopeChanges,
      managementFacts: managementFacts(groupCurrent),
      businessCtas: businessCtas(priorityInvestigations[0]?.routeTarget ?? null),
      issues,
    }
  }

  const scopeDetails: OverviewDemoScopeDetail[] = []
  const nestedStoreDetails: OverviewDemoScopeDetail[] = []
  for (const group of groups) {
    if (group.level === "AREA") {
      const childGroups: ScopeGroup[] = group.stores.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }))
      const childComparisons = rankOverviewDemoScopes(childGroups.map((child) => scopeComparison(child, currentAll, previousAll)))
      const changes = buildOverviewDemoScopeChanges(childComparisons, "门店变化")
      scopeDetails.push(buildScopeDetail(group, rankedComparisons, parentLabel, changes))
      const visibleChildIds = new Set([...changes.declining, ...changes.improving].map((item) => item.scopeId))
      for (const child of childGroups.filter((item) => visibleChildIds.has(item.id))) {
        nestedStoreDetails.push(buildScopeDetail(child, childComparisons, group.label, null))
      }
    } else {
      scopeDetails.push(buildScopeDetail(group, rankedComparisons, parentLabel, null))
    }
  }
  scopeDetails.push(...nestedStoreDetails.filter((detail, index, list) => list.findIndex((item) => item.id === detail.id) === index))

  const issues = buildOverviewDemoIssueIntelligence({ current, previous, identities, attribution })
  const priorityInvestigations = buildOverviewDemoPriorityInvestigations({ issues, attribution })
  const averageScore = averageOverviewDemoScore(rankedComparisons)
  const { xDomain, yDomain } = buildOverviewDemoAttentionDomains(rankedComparisons)
  const lowestIds = [...rankedComparisons]
    .sort((left, right) => (left.score ?? 101) - (right.score ?? 101) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    .slice(0, level === "REGION" ? 3 : 2)
    .map((item) => item.id)
  const decliningIds = [...rankedComparisons]
    .filter((item) => (item.delta ?? 0) < 0)
    .sort((left, right) => (left.delta ?? 0) - (right.delta ?? 0) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    .slice(0, level === "REGION" ? 3 : 2)
    .map((item) => item.id)
  const priorityIssueKeys = new Set(priorityInvestigations.slice(0, 3).map((item) => item.issueKey))
  const priorityStoreIds = issues
    .filter((issue) => priorityIssueKeys.has(issue.id))
    .flatMap((issue) => issue.affectedStores.map((store) => store.storeId))
    .sort()
    .slice(0, 2)
  const priorityIds = [...new Set([...lowestIds, ...decliningIds, ...priorityStoreIds])].slice(0, 5)
  const points = rankedComparisons.map((item) => {
    const isHigh = item.score !== null && averageScore !== null && item.score >= averageScore
    const isUp = (item.delta ?? 0) >= 0
    return {
      ...item,
      quadrantLabel: isHigh
        ? isUp
          ? "高分、改善"
          : "高分、下降"
        : isUp
          ? "低分、改善"
          : "低分、下降",
      labelVisible: level === "REGION" || priorityIds.includes(item.id),
    }
  })

  const comparisonRows =
    rankedComparisons.length <= 10
      ? rankedComparisons
      : [...rankedComparisons.slice(0, 5), ...rankedComparisons.slice(-5)]

  const areaGroups = new Map<string, KpiStore[]>()
  for (const store of selected) areaGroups.set(store.area, [...(areaGroups.get(store.area) ?? []), store])
  const lastMonth = overviewDemoFixture.monthlyHistoryPeriods.at(-2)
  const lastMonthAll = lastMonth ? materializeSnapshots(lastMonth.stores, canonicalStores) : currentAll
  const areaComparisons = [...areaGroups].map(([area, stores]) => scopeComparison({ id: area, label: area, level: "AREA", stores }, currentAll, lastMonthAll))
  const storeComparisons = selected.map((store) => scopeComparison({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }, currentAll, lastMonthAll))
  const monthlyScoreHistory = monthlyHistoryFor(selected, canonicalStores)
  const systemicIssue = [...issues].sort(
    (left, right) => right.affectedAreaCount - left.affectedAreaCount || right.currentCount - left.currentCount,
  )[0]
  const hero: OverviewDemoHero = {
    overallScore: overall.score,
    monthlyDelta: scoreDelta(monthlyScoreHistory.at(-1)?.score ?? null, monthlyScoreHistory.at(-2)?.score ?? null),
    monthlyScoreHistory,
    topImprovingArea: topChange(areaComparisons, "IMPROVING"),
    topImprovingStore: topChange(storeComparisons, "IMPROVING"),
    topDecliningArea: topChange(areaComparisons, "DECLINING"),
    topDecliningStore: topChange(storeComparisons, "DECLINING"),
    primaryScoreLoss: buildOverviewDemoPrimaryScoreLoss(current),
    systemicIssue: systemicIssue ? {
      label: systemicIssue.label,
      affectedAreas: systemicIssue.affectedAreaCount,
      totalAreas: systemicIssue.totalAreaCount,
      affectedStores: systemicIssue.currentCount,
    } : null,
  }

  return {
    scopeLabel: scopeLabel(level, selected, state),
    scopeLevel: level,
    currentPeriodLabel: overviewDemoFixture.currentPeriodLabel,
    previousPeriodLabel: overviewDemoFixture.previousPeriodLabel,
    periodNotice: `全局周期“${periodModeLabel(state)}”尚未映射到 Demo 历史。本页固定分析 ${overviewDemoFixture.currentPeriodLabel}，对比 ${overviewDemoFixture.previousPeriodLabel}，历史截至 ${overviewDemoFixture.currentPeriodLabel}。`,
    scoreRuleVersion: overviewDemoFixture.scoreRuleVersion,
    executive: buildOverviewDemoExecutiveInsight({
      overall,
      overallDelta: scoreDelta(overall.score, previousOverall.score),
      previousPeriodLabel: overviewDemoFixture.previousPeriodLabel,
      comparisons: rankedComparisons,
      issues,
      attribution,
      storeCount: selected.length,
    }),
    hero,
    overallHistory: historyFor(selected, canonicalStores),
    priorityInvestigations,
    attribution,
    attentionMatrix: { averageScore, xDomain, yDomain, points },
    comparisons: comparisonRows,
    dimensions: dimensionViews(current, previous, attribution),
    issues: issues.slice(0, 8),
    facts: factSentences(current),
    scopeDetails,
  }
}
