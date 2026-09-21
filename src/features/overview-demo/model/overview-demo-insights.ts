import type {
  OverviewDemoAttribution,
  OverviewDemoExecutiveInsight,
  OverviewDemoIssueView,
  OverviewDemoScopeComparison,
  OverviewDemoScore,
} from "./overview-demo-types"

function scoreText(value: number | null): string {
  return value === null ? "无可用得分" : `${value} 分`
}

function deltaText(value: number | null): string {
  if (value === null) return "较上期不可比较"
  if (value > 0) return `较上期提升 ${value} 分`
  if (value < 0) return `较上期下降 ${Math.abs(value)} 分`
  return "较上期持平"
}

function scopeText(scope: OverviewDemoScopeComparison | undefined): string {
  return scope ? `${scope.label}（${scoreText(scope.score)}，${deltaText(scope.delta)}）` : "无可比较范围"
}

export function buildOverviewDemoExecutiveInsight(input: {
  overall: OverviewDemoScore
  overallDelta: number | null
  previousPeriodLabel: string
  comparisons: readonly OverviewDemoScopeComparison[]
  issues: readonly OverviewDemoIssueView[]
  attribution: OverviewDemoAttribution
  storeCount: number
}): OverviewDemoExecutiveInsight {
  const scored = input.comparisons.filter((item) => item.score !== null)
  const stable = (left: OverviewDemoScopeComparison, right: OverviewDemoScopeComparison) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  const lowest = [...scored].sort((left, right) => (left.score ?? 0) - (right.score ?? 0) || stable(left, right))[0]
  const highest = [...scored].sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || stable(left, right))[0]
  const changed = input.comparisons.filter((item) => item.delta !== null)
  const largestDecline = [...changed]
    .filter((item) => (item.delta ?? 0) < 0)
    .sort((left, right) => (left.delta ?? 0) - (right.delta ?? 0) || stable(left, right))[0]
  const largestImprovement = [...changed]
    .filter((item) => (item.delta ?? 0) > 0)
    .sort((left, right) => (right.delta ?? 0) - (left.delta ?? 0) || stable(left, right))[0]
  const topIssue = input.issues[0]
  const systemicIssue = [...input.issues].sort(
    (left, right) => right.affectedAreaCount - left.affectedAreaCount || right.currentCount - left.currentCount,
  )[0]
  const biggestNew = input.attribution.newIssues[0]
  const biggestPersistent = input.attribution.persistentIssues[0]
  const declineDriver = input.attribution.declineDrivers[0]
  const improvementDriver = input.attribution.improvementDrivers[0]
  const noteParts = [
    lowest ? `${lowest.label} 是当前优先关注范围` : "暂无可比较的下级范围",
    declineDriver ? `${declineDriver.label} 是主要下降驱动` : "未识别到下降驱动",
    systemicIssue ? `${systemicIssue.label} 涉及 ${systemicIssue.affectedAreaCount} 个小区` : "未识别到跨小区问题",
  ]

  return {
    headline: `当前得分为 ${scoreText(input.overall.score)}，${deltaText(input.overallDelta)}（对比 ${input.previousPeriodLabel}）`,
    overallScore: input.overall.score,
    delta: input.overallDelta,
    completeness: input.overall.completeness,
    storeCount: input.storeCount,
    lowestScope: scopeText(lowest),
    highestScope: scopeText(highest),
    largestDecline: scopeText(largestDecline),
    largestImprovement: scopeText(largestImprovement),
    topIssue: topIssue ? `${topIssue.label}（${topIssue.currentCount} 家门店）` : "无当前问题",
    systemicIssue: systemicIssue
      ? `${systemicIssue.label}（${systemicIssue.affectedAreaCount}/${systemicIssue.totalAreaCount} 个小区）`
      : "无跨小区问题",
    biggestNewIssue: biggestNew
      ? `${biggestNew.label}（${biggestNew.affectedStores.length} 家新增门店）`
      : "本期无新增问题",
    biggestPersistentIssue: biggestPersistent
      ? `${biggestPersistent.label}（${biggestPersistent.affectedStores.length} 家持续门店）`
      : "本期无持续问题",
    primaryDeclineDriver: declineDriver
      ? `${declineDriver.label}，影响 ${declineDriver.affectedStores.length} 家门店`
      : "未识别到下降驱动",
    primaryImprovementDriver: improvementDriver
      ? `${improvementDriver.label}，${improvementDriver.affectedStores.length} 家门店已恢复`
      : "未识别到改善驱动",
    attentionScope: lowest?.label ?? "当前范围",
    note: `${noteParts.join("；")}。${improvementDriver ? `${improvementDriver.label} 本期出现恢复。` : "本期未识别到恢复项。"}`,
    priorityScope: {
      label: "优先关注范围",
      value: lowest?.label ?? "当前范围",
      detail: lowest ? `${scoreText(lowest.score)} · ${deltaText(lowest.delta)}` : "无可比较范围",
    },
    declineSignal: {
      label: "主要下降驱动",
      value: declineDriver?.label ?? "未识别到下降驱动",
      detail: declineDriver ? `影响 ${declineDriver.affectedStores.length} 家门店` : "本期无下降归因",
    },
    systemicSignal: {
      label: "系统性问题",
      value: systemicIssue?.label ?? "无跨小区问题",
      detail: systemicIssue
        ? `${systemicIssue.affectedAreaCount}/${systemicIssue.totalAreaCount} 个小区`
        : "当前范围内未识别",
    },
    improvementSignal: {
      label: "改善最明显",
      value: largestImprovement?.label ?? "无改善范围",
      detail: largestImprovement
        ? deltaText(largestImprovement.delta)
        : "无正向范围变化",
    },
  }
}
