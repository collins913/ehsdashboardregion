import type { KpiStore } from "@/data/contracts/kpi"
import type { EhsStoreScope } from "@/data/contracts/kpi"
import type { PrototypeOverviewPeriodMode } from "./prototype-overview-query"
import { getPrototypeOverviewFixture } from "./fixture-repository"
import { buildPrototypeOverviewAttribution, buildPrototypeOverviewScopeChangeSummary } from "./model/prototype-overview-attribution"
import {
  averagePrototypeOverviewScore,
  buildPrototypeOverviewBenchmark,
  rankPrototypeOverviewScopes,
} from "./model/prototype-overview-benchmark"
import { buildPrototypeOverviewExecutiveInsight } from "./model/prototype-overview-insights"
import { buildPrototypeOverviewScoreChanges } from "./model/prototype-overview-detail-score"
import { buildPrototypeOverviewIssueIntelligence } from "./model/prototype-overview-issues"
import { buildPrototypeOverviewPriorityInvestigations } from "./model/prototype-overview-priority"
import { prototypeOverviewScoredItems, roundOverviewScore, scoreDimensions, scoreOutcomes, scoreStores } from "./model/prototype-overview-score"
import { rankPrototypeOverviewMovements } from "./model/prototype-overview-movements"
import { classifyPrototypeOverviewTrend, scoreDelta } from "./model/prototype-overview-trend"
import type {
  PrototypeOverviewAttentionGroup,
  PrototypeOverviewAttribution,
  PrototypeOverviewChartDomain,
  PrototypeOverviewDiagnosticDimension,
  PrototypeOverviewDimensionView,
  PrototypeOverviewDriverView,
  PrototypeOverviewHistoryPoint,
  PrototypeOverviewHero,
  PrototypeOverviewIssueView,
  PrototypeOverviewManagementFact,
  PrototypeOverviewMovementScope,
  PrototypeOverviewOperationalFacts,
  PrototypeOverviewPriorityInvestigation,
  PrototypeOverviewScopeChangeItem,
  PrototypeOverviewScopeComparison,
  PrototypeOverviewScopeScoreComparison,
  PrototypeOverviewScopeDetail,
  PrototypeOverviewScopeDimensionScore,
  PrototypeOverviewScopeLevel,
  PrototypeOverviewStoreIdentity,
  PrototypeOverviewStoreSnapshot,
  PrototypeOverviewResult,
} from "./model/prototype-overview-types"

const prototypeOverviewFixture = getPrototypeOverviewFixture()

export function buildPrototypeOverviewAttentionDomains(
  comparisons: readonly Pick<PrototypeOverviewScopeComparison, "score" | "delta">[],
): { xDomain: PrototypeOverviewChartDomain; yDomain: PrototypeOverviewChartDomain } {
  const scores = comparisons.map((item) => item.score).filter((value): value is number => value !== null)
  const deltas = comparisons.map((item) => item.delta).filter((value): value is number => value !== null)
  if (scores.length === 0) return { xDomain: [0, 100], yDomain: [-2, 2] }

  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const xPadding = 8
  const xDomain: PrototypeOverviewChartDomain = [
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

type PrototypeOverviewFilters = EhsStoreScope & { periodMode: PrototypeOverviewPeriodMode; requestedScope?: EhsStoreScope }

function scopedIdentities(stores: readonly KpiStore[], state: PrototypeOverviewFilters): readonly KpiStore[] {
  return stores.filter(
    (store) =>
      includes(state.region, store.region) &&
      includes(state.area, store.area) &&
      includes(state.store, store.storeId),
  )
}

function peerIdentities(stores: readonly KpiStore[], state: PrototypeOverviewFilters): readonly KpiStore[] {
  return stores.filter(
    (store) => includes(state.region, store.region) && includes(state.area, store.area),
  )
}

function storeIdentities(stores: readonly KpiStore[]): PrototypeOverviewStoreIdentity[] {
  return stores.map((store) => ({ storeId: store.storeId, storeLabel: store.displayName, area: store.area }))
}

function pickSnapshots(
  snapshots: readonly PrototypeOverviewStoreSnapshot[],
  identities: readonly KpiStore[],
): readonly PrototypeOverviewStoreSnapshot[] {
  const ids = new Set(identities.map((store) => store.storeId))
  return snapshots.filter((store) => ids.has(store.storeId))
}

function materializeSnapshots(
  templates: readonly PrototypeOverviewStoreSnapshot[],
  identities: readonly KpiStore[],
): readonly PrototypeOverviewStoreSnapshot[] {
  const snapshotsById = new Map(templates.map((snapshot) => [snapshot.storeId, snapshot]))
  const positions = new Map<string, number>()
  const fallbackAreas = [...new Set(identities.map((store) => store.area))].sort()

  return identities.map((identity) => {
    const directSnapshot = snapshotsById.get(identity.storeId)
    if (directSnapshot) return directSnapshot
    const position = positions.get(identity.area) ?? 0
    positions.set(identity.area, position + 1)
    const scenarioIndex =
      prototypeOverviewFixture.areaScenarioIndex[identity.area] ?? Math.max(0, fallbackAreas.indexOf(identity.area)) % 6
    const templateIndex = scenarioIndex === 2 && position % 3 === 2 ? 10 : scenarioIndex * 2 + (position % 2)
    return { ...templates[templateIndex], storeId: identity.storeId }
  })
}

function factsFor(stores: readonly PrototypeOverviewStoreSnapshot[]): PrototypeOverviewOperationalFacts {
  return stores.reduce(
    (total, store) => ({
      openActions: total.openActions + store.operationalFacts.openActions,
      openEvents: total.openEvents + store.operationalFacts.openEvents,
      submissionTotal: total.submissionTotal + store.operationalFacts.submissionTotal,
    }),
    { openActions: 0, openEvents: 0, submissionTotal: 0 },
  )
}

function factSentences(stores: readonly PrototypeOverviewStoreSnapshot[]): string[] {
  const facts = factsFor(stores)
  return [
    `当前 Open Actions：${facts.openActions}`,
    `当前 Open Events：${facts.openEvents}`,
    `当前 Submission Total：${facts.submissionTotal}`,
  ]
}

function managementFacts(stores: readonly PrototypeOverviewStoreSnapshot[]): PrototypeOverviewManagementFact[] {
  const facts = factsFor(stores)
  return [
    { key: "OPEN_ACTIONS", label: "Open Actions", value: facts.openActions },
    { key: "OPEN_EVENTS", label: "Open Events", value: facts.openEvents },
    { key: "SUBMISSION_TOTAL", label: "Submission Total", value: facts.submissionTotal },
  ]
}

function scopeDimensionScores(
  current: readonly PrototypeOverviewStoreSnapshot[],
  previous: readonly PrototypeOverviewStoreSnapshot[],
  storeCount: number,
): PrototypeOverviewScopeDimensionScore[] {
  const currentDimensions = new Map(scoreDimensions(current).map((dimension) => [dimension.id, dimension]))
  const previousDimensions = new Map(scoreDimensions(previous).map((dimension) => [dimension.id, dimension]))
  const perStorePoints = (points: number | null) => points === null || storeCount === 0 ? null : roundOverviewScore(points / storeCount)
  return (["PERFORMANCE", "TAKE_CHARGE", "CERTIFICATES", "ENVIRONMENT"] as const).map((id) => {
    const counts = id === "ENVIRONMENT" ? undefined : currentDimensions.get(id)
    const earnedPoints = counts && counts.availableCount > 0 ? counts.passedCount : null
    const totalPoints = counts?.expectedCount ?? null
    return {
      id,
      earnedPoints,
      totalPoints,
      averageEarnedPoints: perStorePoints(earnedPoints),
      averageTotalPoints: perStorePoints(totalPoints),
      delta: scoreDelta(counts?.score ?? null, (id === "ENVIRONMENT" ? undefined : previousDimensions.get(id))?.score ?? null),
      items: prototypeOverviewScoredItems.filter((item) => item.dimension === id).map((item) => {
        const currentItem = scoreOutcomes(current.map((store) => store.outcomes[item.id]))
        const previousItem = scoreOutcomes(previous.map((store) => store.outcomes[item.id]))
        const earnedPoints = currentItem.availableCount > 0 ? currentItem.passedCount : null
        return {
          id: item.id,
          earnedPoints,
          totalPoints: currentItem.expectedCount,
          averageEarnedPoints: perStorePoints(earnedPoints),
          averageTotalPoints: perStorePoints(currentItem.expectedCount),
          delta: scoreDelta(currentItem.score, previousItem.score),
        }
      }),
    }
  })
}

function diagnosticStatus(dimension: "PERFORMANCE" | "TAKE_CHARGE" | "CERTIFICATES", itemId: string): "异常" | "未达成" {
  return dimension === "CERTIFICATES" || itemId === "events" ? "异常" : "未达成"
}

function diagnosticDimensions(
  dimensions: readonly PrototypeOverviewDimensionView[],
  issues: readonly PrototypeOverviewIssueView[],
  priorityInvestigations: readonly PrototypeOverviewPriorityInvestigation[],
  attribution: PrototypeOverviewAttribution,
  current: readonly PrototypeOverviewStoreSnapshot[],
  previous: readonly PrototypeOverviewStoreSnapshot[],
): PrototypeOverviewDiagnosticDimension[] {
  const issueByKey = new Map(issues.map((issue) => [issue.id, issue]))
  const declineKeys = new Set(attribution.declineDrivers.map((item) => item.metricKey))
  const priorityIndex = new Map(priorityInvestigations.map((item, index) => [item.issueKey, index]))
  const categoryByKey = new Map(prototypeOverviewScoredItems.map((item) => [item.id, item]))
  const currentScoring = scoreStores(current)
  const previousScoring = scoreStores(previous)
  const comparable = currentScoring.score !== null && previousScoring.score !== null && currentScoring.availableCount === previousScoring.availableCount
  const impactByKey = new Map(buildPrototypeOverviewScoreChanges(current, previous).map((change) => [change.key, change.deltaPoints]))

  return dimensions
    .map((dimension, dimensionIndex) => {
      const dimensionIssues = priorityInvestigations
        .filter((item) => item.dimension === dimension.id)
        .map((item) => {
          const issue = issueByKey.get(item.issueKey)!
          const category = categoryByKey.get(item.issueKey)!
          return {
            issueKey: item.issueKey,
            categoryKey: item.issueKey,
            categoryLabel: category.label,
            status: diagnosticStatus(category.dimension, category.id),
            scoreImpact: comparable ? impactByKey.get(item.issueKey) ?? 0 : null,
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

export function buildPrototypeOverviewScopeChanges(
  comparisons: readonly PrototypeOverviewScopeComparison[],
  label: "小区变化" | "门店变化",
) {
  const toItem = (item: PrototypeOverviewScopeComparison & { delta: number }): PrototypeOverviewScopeChangeItem => ({
    scopeId: item.id,
    scopeName: item.label,
    currentScore: item.score,
    delta: item.delta,
    completeness: item.completeness,
  })
  const comparable = comparisons.filter((item): item is PrototypeOverviewScopeComparison & { delta: number } => item.delta !== null)
  const stable = (left: PrototypeOverviewScopeComparison, right: PrototypeOverviewScopeComparison) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  return {
    label,
    declining: [...comparable].filter((item) => item.delta < 0).sort((left, right) => left.delta - right.delta || stable(left, right)).slice(0, 5).map(toItem),
    improving: [...comparable].filter((item) => item.delta > 0).sort((left, right) => right.delta - left.delta || stable(left, right)).slice(0, 5).map(toItem),
  }
}

function dimensionViews(
  current: readonly PrototypeOverviewStoreSnapshot[],
  previous: readonly PrototypeOverviewStoreSnapshot[],
  attribution: PrototypeOverviewAttribution,
): PrototypeOverviewDimensionView[] {
  const previousScores = new Map(scoreDimensions(previous).map((dimension) => [dimension.id, dimension]))
  const views = scoreDimensions(current).map((dimension) => {
    const metrics = prototypeOverviewScoredItems.filter((item) => item.dimension === dimension.id)
    const items = metrics.map((metric) => {
      const passCount = current.filter((store) => store.outcomes[metric.id] === "PASS").length
      const previousPassCount = previous.filter((store) => store.outcomes[metric.id] === "PASS").length
      const count = (list: PrototypeOverviewAttribution["newIssues"]) =>
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

function scopeLevel(state: PrototypeOverviewFilters): PrototypeOverviewScopeLevel {
  if (state.store.kind === "INCLUDE" && state.store.values.length === 1) return "STORE"
  if (state.area.kind === "INCLUDE" || state.store.kind === "INCLUDE") return "AREA"
  return "REGION"
}

type ScopeGroup = { id: string; label: string; level: PrototypeOverviewScopeLevel; stores: readonly KpiStore[] }

function groupIdentities(
  level: PrototypeOverviewScopeLevel,
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

function attentionScopeGroups(
  stores: readonly KpiStore[],
  selected: readonly KpiStore[],
  state: PrototypeOverviewFilters,
): ScopeGroup[] {
  // Authorization expands ALL into explicit ids; use the original selection only
  // to choose the display level. Every candidate remains an authorized store.
  const requested = state.requestedScope ?? state
  if (requested.store.kind === "INCLUDE" && requested.store.values.length > 1) {
    return selected.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }))
  }
  if (requested.store.kind === "INCLUDE" && requested.store.values.length === 1) {
    const target = selected[0]
    if (!target) return []
    return stores.filter((store) => store.area === target.area && store.region === target.region)
      .map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }))
  }
  if (requested.area.kind === "INCLUDE") {
    return selected.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }))
  }
  const hasSingleRegion = new Set(stores.map((store) => store.region)).size === 1
  const level = requested.region.kind === "INCLUDE" || hasSingleRegion ? "AREA" : "REGION"
  const groups = new Map<string, KpiStore[]>()
  for (const store of selected) {
    const label = level === "REGION" ? store.region : store.area
    groups.set(label, [...(groups.get(label) ?? []), store])
  }
  return [...groups].map(([label, members]) => ({ id: label, label, level, stores: members }))
}

function scopeLabel(level: PrototypeOverviewScopeLevel, stores: readonly KpiStore[], state: PrototypeOverviewFilters): string {
  if (level === "STORE") return stores[0]?.displayName ?? "当前门店"
  if (state.store.kind === "INCLUDE") return `已选 ${stores.length} 家门店`
  if (level === "AREA") return state.area.kind === "INCLUDE" ? state.area.values[0] : "当前小区"
  return state.region.kind === "INCLUDE" ? state.region.values[0] : "全部区域"
}

function driverViews(items: PrototypeOverviewAttribution["newIssues"]): PrototypeOverviewDriverView[] {
  return items.slice(0, 4).map((item) => {
    const category = prototypeOverviewScoredItems.find((definition) => definition.id === item.metricKey)!
    return {
      categoryKey: item.metricKey,
      categoryLabel: category.label,
      status: item.currentResult === "PASS"
        ? category.dimension === "CERTIFICATES" || category.id === "events" ? "正常" : "达成"
        : diagnosticStatus(category.dimension, category.id),
      affectedCount: item.affectedStores.length,
      affectedAreas: item.affectedAreas.length,
      transition: item.transition,
    }
  })
}

function scopeComparison(
  group: ScopeGroup,
  currentAll: readonly PrototypeOverviewStoreSnapshot[],
  previousAll: readonly PrototypeOverviewStoreSnapshot[],
): PrototypeOverviewScopeScoreComparison {
  const groupCurrent = pickSnapshots(currentAll, group.stores)
  const groupPrevious = pickSnapshots(previousAll, group.stores)
  const groupAttribution = buildPrototypeOverviewAttribution({
    current: groupCurrent,
    previous: groupPrevious,
    identities: storeIdentities(group.stores),
  })
  const score = scoreStores(groupCurrent)
  const previousResult = scoreStores(groupPrevious)
  const previousScore = previousResult.score
  const earnedPoints = score.availableCount === 0 ? null : score.passedCount
  const previousEarnedPoints = previousResult.availableCount === 0 ? null : previousResult.passedCount
  const delta = scoreDelta(score.score, previousScore)
  const changeSummary = buildPrototypeOverviewScopeChangeSummary(delta, groupAttribution)
  return {
    id: group.id,
    rank: null,
    label: group.label,
    level: group.level,
    score: score.score,
    previousScore,
    delta,
    completeness: score.completeness,
    earnedPoints,
    totalPoints: score.expectedCount,
    pointDelta: scoreDelta(earnedPoints, previousEarnedPoints),
    storeCount: group.stores.length,
    mainChange: changeSummary.mainChange,
    currentConcern: changeSummary.currentConcern,
  }
}

function monthlyHistoryFor(
  stores: readonly KpiStore[],
  allStores: readonly KpiStore[],
): PrototypeOverviewHistoryPoint[] {
  return prototypeOverviewFixture.monthlyHistoryPeriods.map((period) => ({
    periodLabel: period.periodLabel,
    score: scoreStores(pickSnapshots(materializeSnapshots(period.stores, allStores), stores)).score,
  }))
}

export function buildPrototypeOverviewPrimaryScoreLoss(current: readonly PrototypeOverviewStoreSnapshot[]): PrototypeOverviewHero["primaryScoreLoss"] {
  const losses = prototypeOverviewScoredItems.map((item) => ({
    label: item.issueLabel,
    affectedStores: current.filter((store) => store.outcomes[item.id] === "FAIL").length,
  }))
  const highest = losses.reduce<(typeof losses)[number] | null>(
    (best, item) => !best || item.affectedStores > best.affectedStores ? item : best,
    null,
  )
  return highest && highest.affectedStores > 0 ? highest : null
}

function periodModeLabel(state: PrototypeOverviewFilters): string {
  if (state.periodMode === "THIS_YEAR") return "本年"
  if (state.periodMode === "THIS_QUARTER") return "本季度"
  if (state.periodMode === "THIS_MONTH") return "本月"
  return "自定义周期"
}

export function buildPrototypeOverviewResult(
  canonicalStores: readonly KpiStore[],
  state: PrototypeOverviewFilters,
): PrototypeOverviewResult {
  const selected = scopedIdentities(canonicalStores, state)
  const peers = peerIdentities(canonicalStores, state)
  const level = scopeLevel(state)
  const currentAll = materializeSnapshots(prototypeOverviewFixture.currentStores, canonicalStores)
  const previousAll = materializeSnapshots(prototypeOverviewFixture.previousStores, canonicalStores)
  const lastMonth = prototypeOverviewFixture.monthlyHistoryPeriods.at(-2)
  const lastMonthAll = lastMonth ? materializeSnapshots(lastMonth.stores, canonicalStores) : currentAll
  const current = pickSnapshots(currentAll, selected)
  const previous = pickSnapshots(previousAll, selected)
  const identities = storeIdentities(selected)
  const attribution = buildPrototypeOverviewAttribution({ current, previous, identities })
  const overall = scoreStores(current)
  const previousOverall = scoreStores(previous)
  const groups = groupIdentities(level, selected, peers)

  const rawComparisons = groups.map((group) => scopeComparison(group, currentAll, previousAll))
  const rankedComparisons = rankPrototypeOverviewScopes(rawComparisons)
  const parentLabel = level === "REGION" ? scopeLabel(level, selected, state) : selected[0]?.area ?? "当前小区"
  const buildScopeDetail = (
    group: ScopeGroup,
    peerComparisons: readonly PrototypeOverviewScopeComparison[],
    benchmarkLabel: string,
    scopeChanges: PrototypeOverviewScopeDetail["scopeChanges"],
  ): PrototypeOverviewScopeDetail => {
    const groupCurrent = pickSnapshots(currentAll, group.stores)
    const groupPrevious = pickSnapshots(previousAll, group.stores)
    const groupIdentitiesForModel = storeIdentities(group.stores)
    const groupAttribution = buildPrototypeOverviewAttribution({
      current: groupCurrent,
      previous: groupPrevious,
      identities: groupIdentitiesForModel,
    })
    const score = scoreStores(groupCurrent)
    const comparison = peerComparisons.find((item) => item.id === group.id)
    const issues = buildPrototypeOverviewIssueIntelligence({
      current: groupCurrent,
      previous: groupPrevious,
      identities: groupIdentitiesForModel,
      attribution: groupAttribution,
    })
    const priorityInvestigations = buildPrototypeOverviewPriorityInvestigations({
      issues,
      attribution: groupAttribution,
    })
    const monthlyPrevious = pickSnapshots(lastMonthAll, group.stores)
    const dimensions = dimensionViews(groupCurrent, monthlyPrevious, groupAttribution)
    const dimensionScores = scopeDimensionScores(groupCurrent, monthlyPrevious, group.stores.length)
    const diagnostics = diagnosticDimensions(dimensions, issues, priorityInvestigations, groupAttribution, groupCurrent, monthlyPrevious)
    const monthlyHistory = monthlyHistoryFor(group.stores, canonicalStores)
    return {
      id: group.id,
      label: group.label,
      level: group.level,
      storeCount: group.stores.length,
      score: score.score,
      previousScore: scoreStores(groupPrevious).score,
      delta: comparison?.delta ?? null,
      monthlyDelta: scoreDelta(score.score, scoreStores(monthlyPrevious).score),
      completeness: score.completeness,
      benchmark: buildPrototypeOverviewBenchmark({ id: group.id, parentLabel: benchmarkLabel, comparisons: peerComparisons }),
      monthlyHistory,
      trendLabel: classifyPrototypeOverviewTrend(monthlyHistory),
      diagnostics,
      dimensionScores,
      changeSummary: {
        newIssues: driverViews(groupAttribution.newIssues),
        persistentIssues: driverViews(groupAttribution.persistentIssues),
        recovered: driverViews(groupAttribution.recovered),
      },
      scopeChanges,
      managementFacts: managementFacts(groupCurrent),
      issues,
    }
  }

  const scopeDetails: PrototypeOverviewScopeDetail[] = []
  const nestedStoreDetails: PrototypeOverviewScopeDetail[] = []
  for (const group of groups) {
    if (group.level === "AREA") {
      const childGroups: ScopeGroup[] = group.stores.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }))
      const childComparisons = rankPrototypeOverviewScopes(childGroups.map((child) => scopeComparison(child, currentAll, previousAll)))
      const changes = buildPrototypeOverviewScopeChanges(childComparisons, "门店变化")
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

  const issues = buildPrototypeOverviewIssueIntelligence({ current, previous, identities, attribution })
  const priorityInvestigations = buildPrototypeOverviewPriorityInvestigations({ issues, attribution })
  const matrixScopeGroups = attentionScopeGroups(canonicalStores, selected, state)
  const matrixComparisons = rankPrototypeOverviewScopes(matrixScopeGroups.map((group) => scopeComparison(group, currentAll, previousAll)))
  for (const group of matrixScopeGroups) {
    if (!scopeDetails.some((detail) => detail.id === group.id && detail.level === group.level)) {
      scopeDetails.push(buildScopeDetail(group, matrixComparisons, group.level === "REGION" ? "整体平均" : group.level === "AREA" ? selected[0]?.region ?? "当前区域" : group.stores[0]?.area ?? "当前小区", null))
    }
  }
  const averageScore = averagePrototypeOverviewScore(matrixComparisons)
  const { xDomain, yDomain } = buildPrototypeOverviewAttentionDomains(matrixComparisons)
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
  const points = matrixComparisons.map((item) => {
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

  // Preserve exact coordinates and every member; missing coordinates cannot be plotted.
  const groupsByPosition = new Map<string, PrototypeOverviewAttentionGroup>()
  for (const point of points) {
    if (point.score === null || point.delta === null) continue
    const id = JSON.stringify([point.score, point.delta])
    const group = groupsByPosition.get(id)
    if (group) {
      group.members.push(point)
      group.count += 1
    } else {
      groupsByPosition.set(id, { id, score: point.score, delta: point.delta, level: point.level, count: 1, members: [point] })
    }
  }
  const attentionGroups = [...groupsByPosition.values()]

  const areaGroups = new Map<string, KpiStore[]>()
  for (const store of selected) areaGroups.set(store.area, [...(areaGroups.get(store.area) ?? []), store])
  const areaComparisons = [...areaGroups].map(([area, stores]) => scopeComparison({ id: area, label: area, level: "AREA", stores }, currentAll, previousAll))
  const storeComparisons = selected.map((store) => scopeComparison({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }, currentAll, previousAll))
  const rankedStoreComparisons = rankPrototypeOverviewScopes(storeComparisons)
  const selectedStoreById = new Map(selected.map((store) => [store.storeId, store]))
  const candidates = (comparisons: readonly PrototypeOverviewScopeComparison[], storesFor: (id: string) => readonly KpiStore[]) => comparisons.map((item) => ({
    id: item.id,
    name: item.label,
    current: item.score,
    previous: item.previousScore,
    currentCompleteness: item.completeness,
    previousCompleteness: scoreStores(pickSnapshots(previousAll, storesFor(item.id))).completeness,
  }))
  const areaRanking = rankPrototypeOverviewMovements(candidates(areaComparisons, (id) => areaGroups.get(id) ?? []))
  const storeRanking = rankPrototypeOverviewMovements(candidates(storeComparisons, (id) => {
    const store = selectedStoreById.get(id)
    return store ? [store] : []
  }))
  const areaExtrema = { improving: areaRanking.improving[0] ?? null, declining: areaRanking.declining[0] ?? null }
  const storeExtrema = { improving: storeRanking.improving[0] ?? null, declining: storeRanking.declining[0] ?? null }
  const toRankedScope = (item: (typeof areaRanking.improving)[number]) => ({ id: item.id, name: item.name, delta: item.delta })
  const toHeroScope = (item: typeof areaExtrema.improving) => item ? { id: item.id, name: item.name, delta: item.delta } : null
  const movementScope = (item: typeof areaExtrema.improving, stores: readonly KpiStore[] | undefined): PrototypeOverviewMovementScope | null => {
    if (!item || !stores) return null
    const currentSnapshots = pickSnapshots(currentAll, stores)
    const previousSnapshots = pickSnapshots(previousAll, stores)
    return {
      id: item.id,
      name: item.name,
      currentScore: item.current,
      delta: item.delta,
      scoreChanges: buildPrototypeOverviewScoreChanges(currentSnapshots, previousSnapshots),
      scoreChangesUnavailable: false,
    }
  }
  const storeGroupFor = (id: string | undefined) => {
    const store = id ? selectedStoreById.get(id) : undefined
    return store ? [store] : undefined
  }
  const movements = {
    improving: { area: movementScope(areaExtrema.improving, areaGroups.get(areaExtrema.improving?.id ?? "")), store: movementScope(storeExtrema.improving, storeGroupFor(storeExtrema.improving?.id)) },
    declining: { area: movementScope(areaExtrema.declining, areaGroups.get(areaExtrema.declining?.id ?? "")), store: movementScope(storeExtrema.declining, storeGroupFor(storeExtrema.declining?.id)) },
  }
  for (const [item, scopeType] of [...areaRanking.improving.map((item) => [item, "AREA"] as const), ...areaRanking.declining.map((item) => [item, "AREA"] as const), ...storeRanking.improving.map((item) => [item, "STORE"] as const), ...storeRanking.declining.map((item) => [item, "STORE"] as const)]) {
    if (!item || scopeDetails.some((detail) => detail.id === item.id && detail.level === scopeType)) continue
    const stores = scopeType === "AREA" ? areaGroups.get(item.id) : storeGroupFor(item.id)
    if (stores) scopeDetails.push(buildScopeDetail({ id: item.id, label: item.name, level: scopeType, stores }, scopeType === "AREA" ? areaComparisons : storeComparisons, scopeType === "AREA" ? scopeLabel(level, selected, state) : stores[0]?.area ?? "当前小区", null))
  }
  const existingDetailIds = new Set(scopeDetails.filter((detail) => detail.level === "STORE").map((detail) => detail.id))
  for (const store of selected) {
    if (!existingDetailIds.has(store.storeId)) scopeDetails.push(buildScopeDetail({ id: store.storeId, label: store.displayName, level: "STORE", stores: [store] }, rankedStoreComparisons, store.area, null))
  }
  const monthlyScoreHistory = monthlyHistoryFor(selected, canonicalStores)
  const systemicIssue = [...issues].sort(
    (left, right) => right.affectedAreaCount - left.affectedAreaCount || right.currentCount - left.currentCount,
  )[0]
  const hero: PrototypeOverviewHero = {
    improvingRanking: { areas: areaRanking.improving.map(toRankedScope), stores: storeRanking.improving.map(toRankedScope) },
    decliningRanking: { areas: areaRanking.declining.map(toRankedScope), stores: storeRanking.declining.map(toRankedScope) },
    overallScore: overall.score,
    monthlyDelta: scoreDelta(monthlyScoreHistory.at(-1)?.score ?? null, monthlyScoreHistory.at(-2)?.score ?? null),
    monthlyScoreHistory,
    topImprovingArea: toHeroScope(areaExtrema.improving),
    topImprovingStore: toHeroScope(storeExtrema.improving),
    topDecliningArea: toHeroScope(areaExtrema.declining),
    topDecliningStore: toHeroScope(storeExtrema.declining),
    primaryScoreLoss: buildPrototypeOverviewPrimaryScoreLoss(current),
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
    currentPeriodLabel: prototypeOverviewFixture.currentPeriodLabel,
    previousPeriodLabel: prototypeOverviewFixture.previousPeriodLabel,
    periodNotice: `全局周期“${periodModeLabel(state)}”尚未映射到 Demo 历史。本页固定分析 ${prototypeOverviewFixture.currentPeriodLabel}，对比 ${prototypeOverviewFixture.previousPeriodLabel}，历史截至 ${prototypeOverviewFixture.currentPeriodLabel}。`,
    scoreRuleVersion: prototypeOverviewFixture.scoreRuleVersion,
    executive: buildPrototypeOverviewExecutiveInsight({
      overall,
      overallDelta: scoreDelta(overall.score, previousOverall.score),
      previousPeriodLabel: prototypeOverviewFixture.previousPeriodLabel,
      comparisons: rankedComparisons,
      issues,
      attribution,
      storeCount: selected.length,
    }),
    hero,
    movements,
    priorityInvestigations,
    attribution,
    attentionMatrix: { averageScore, xDomain, yDomain, points, groups: attentionGroups },
    comparisons: rankedStoreComparisons,
    dimensions: dimensionViews(current, previous, attribution),
    dimensionScores: scopeDimensionScores(current, previous, selected.length),
    storeCount: selected.length,
    issues: issues.slice(0, 8),
    facts: factSentences(current),
    scopeDetails,
  }
}
