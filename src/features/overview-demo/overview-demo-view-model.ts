import type { KpiStore } from "@/data/contracts/kpi"
import type { GlobalFilterState } from "@/features/global-filters/global-filter-state"
import { getOverviewDemoFixture } from "./data/overview-demo-fixture-repository"
import { buildOverviewDemoAttribution } from "./model/overview-demo-attribution"
import {
  averageOverviewDemoScore,
  buildOverviewDemoBenchmark,
  rankOverviewDemoScopes,
} from "./model/overview-demo-benchmark"
import { buildOverviewDemoExecutiveInsight } from "./model/overview-demo-insights"
import { buildOverviewDemoIssueIntelligence } from "./model/overview-demo-issues"
import { buildOverviewDemoPriorityInvestigations } from "./model/overview-demo-priority"
import { overviewDemoScoredItems, scoreDimensions, scoreStores } from "./model/overview-demo-score"
import { scoreDelta } from "./model/overview-demo-trend"
import type {
  OverviewDemoAttribution,
  OverviewDemoDimensionView,
  OverviewDemoDriverView,
  OverviewDemoHistoryPoint,
  OverviewDemoOperationalFacts,
  OverviewDemoScopeComparison,
  OverviewDemoScopeDetail,
  OverviewDemoScopeLevel,
  OverviewDemoStoreIdentity,
  OverviewDemoStoreSnapshot,
  OverviewDemoViewModel,
} from "./model/overview-demo-types"

const overviewDemoFixture = getOverviewDemoFixture()

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
      primaryDrag: newDriver?.label ?? persistentDriver?.label ?? "无明确拖累项",
      primaryImprovement: recoveredDriver?.label ?? "无明确改善项",
      explanation: `${dimension.label} 当前 ${dimension.score ?? "—"} 分，较上期${delta === null ? "不可比" : delta > 0 ? `提升 ${delta} 分` : delta < 0 ? `下降 ${Math.abs(delta)} 分` : "持平"}；${failedStores} 家门店存在失败项。`,
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
      explanation: "评分模型与趋势口径待定义；未来接入后展示监测结果、异常分布与变化归因。",
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

function topHint(attribution: OverviewDemoAttribution): string {
  const decline = attribution.newIssues[0]
  if (decline) return `新增拖累：${decline.label}`
  const recovered = attribution.recovered[0]
  if (recovered) return `主要改善：${recovered.label}`
  const persistent = attribution.persistentIssues[0]
  return persistent ? `持续问题：${persistent.label}` : "无主要变化"
}

function driverViews(items: OverviewDemoAttribution["newIssues"]): OverviewDemoDriverView[] {
  return items.slice(0, 4).map((item) => ({
    label: item.label,
    affectedCount: item.affectedStores.length,
    affectedAreas: item.affectedAreas.length,
    transition: item.transition,
  }))
}

function topIssueLabel(attribution: OverviewDemoAttribution): string {
  const issue = attribution.persistentIssues[0] ?? attribution.newIssues[0]
  return issue?.label ?? "无当前重点问题"
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

  const rawComparisons = groups.map((group) => {
    const groupCurrent = pickSnapshots(currentAll, group.stores)
    const groupPrevious = pickSnapshots(previousAll, group.stores)
    const groupAttribution = buildOverviewDemoAttribution({
      current: groupCurrent,
      previous: groupPrevious,
      identities: storeIdentities(group.stores),
    })
    const score = scoreStores(groupCurrent)
    return {
      id: group.id,
      rank: null,
      label: group.label,
      level: group.level,
      score: score.score,
      previousScore: scoreStores(groupPrevious).score,
      delta: scoreDelta(score.score, scoreStores(groupPrevious).score),
      completeness: score.completeness,
      storeCount: group.stores.length,
      topHint: topHint(groupAttribution),
      topIssue: topIssueLabel(groupAttribution),
    } satisfies OverviewDemoScopeComparison
  })
  const rankedComparisons = rankOverviewDemoScopes(rawComparisons)
  const parentLabel = level === "REGION" ? scopeLabel(level, selected, state) : selected[0]?.area ?? "当前小区"
  const scopeDetails: OverviewDemoScopeDetail[] = groups.map((group) => {
    const groupCurrent = pickSnapshots(currentAll, group.stores)
    const groupPrevious = pickSnapshots(previousAll, group.stores)
    const groupIdentitiesForModel = storeIdentities(group.stores)
    const groupAttribution = buildOverviewDemoAttribution({
      current: groupCurrent,
      previous: groupPrevious,
      identities: groupIdentitiesForModel,
    })
    const score = scoreStores(groupCurrent)
    const comparison = rankedComparisons.find((item) => item.id === group.id)
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
    return {
      id: group.id,
      label: group.label,
      level: group.level,
      conclusion: `${group.label} 当前 ${score.score ?? "—"} 分，${comparison?.topHint ?? "无主要变化"}。`,
      score: score.score,
      previousScore: scoreStores(groupPrevious).score,
      delta: comparison?.delta ?? null,
      completeness: score.completeness,
      benchmark: buildOverviewDemoBenchmark({ id: group.id, parentLabel, comparisons: rankedComparisons }),
      history: historyFor(group.stores, canonicalStores),
      priorityInvestigations,
      dimensions: dimensionViews(groupCurrent, groupPrevious, groupAttribution),
      declineDrivers: driverViews(groupAttribution.declineDrivers),
      improvementDrivers: driverViews(groupAttribution.improvementDrivers),
      changeSummary: {
        newIssues: driverViews(groupAttribution.newIssues),
        persistentIssues: driverViews(groupAttribution.persistentIssues),
        recovered: driverViews(groupAttribution.recovered),
      },
      facts: factSentences(groupCurrent),
      issues,
    }
  })

  const issues = buildOverviewDemoIssueIntelligence({ current, previous, identities, attribution })
  const priorityInvestigations = buildOverviewDemoPriorityInvestigations({ issues, attribution })
  const averageScore = averageOverviewDemoScore(rankedComparisons)
  const deltaRange = Math.max(1, ...rankedComparisons.map((item) => Math.abs(item.delta ?? 0)))
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
      xPercent: Math.max(4, Math.min(96, item.score ?? 0)),
      yPercent: Math.max(7, Math.min(93, 50 - ((item.delta ?? 0) / deltaRange) * 40)),
      quadrantLabel: isHigh
        ? isUp
          ? "领先改善"
          : "领先承压"
        : isUp
          ? "落后改善"
          : "落后承压",
      labelVisible: level === "REGION" || priorityIds.includes(item.id),
    }
  })

  const priorityScopes = priorityIds
    .map((id) => rankedComparisons.find((item) => item.id === id))
    .filter((item): item is OverviewDemoScopeComparison => Boolean(item))

  const comparisonRows =
    rankedComparisons.length <= 10
      ? rankedComparisons
      : [...rankedComparisons.slice(0, 5), ...rankedComparisons.slice(-5)]

  return {
    scopeLabel: scopeLabel(level, selected, state),
    scopeLevel: level,
    currentPeriodLabel: overviewDemoFixture.currentPeriodLabel,
    previousPeriodLabel: overviewDemoFixture.previousPeriodLabel,
    periodNotice: `全局周期“${periodModeLabel(state)}”未映射到 Demo 历史；本页固定分析 ${overviewDemoFixture.currentPeriodLabel}，对比 ${overviewDemoFixture.previousPeriodLabel}，历史截至 ${overviewDemoFixture.currentPeriodLabel}。`,
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
    overallHistory: historyFor(selected, canonicalStores),
    priorityInvestigations,
    attribution,
    attentionMatrix: { averageScore, deltaRange, points, priorityScopes },
    comparisons: comparisonRows,
    dimensions: dimensionViews(current, previous, attribution),
    issues: issues.slice(0, 8),
    facts: factSentences(current),
    scopeDetails,
  }
}
