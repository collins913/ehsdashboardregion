import type {
  OverviewDemoAttribution,
  OverviewDemoExecutiveInsight,
  OverviewDemoIssueView,
  OverviewDemoScopeComparison,
  OverviewDemoScore,
} from "./overview-demo-types"

function scoreText(value: number | null): string {
  return value === null ? "暂无可用评分" : `${value} 分`
}

function deltaText(value: number | null): string {
  if (value === null) return "暂无法比较上一周期"
  if (value > 0) return `提升 ${value} 分`
  if (value < 0) return `下降 ${Math.abs(value)} 分`
  return "持平"
}

function scopeText(scope: OverviewDemoScopeComparison | undefined): string {
  return scope ? `${scope.label}（${scoreText(scope.score)}，${deltaText(scope.delta)}）` : "暂无可比较范围"
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
  const lowest = [...scored].sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0]
  const highest = [...scored].sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0]
  const changed = input.comparisons.filter((item) => item.delta !== null)
  const largestDecline = [...changed]
    .filter((item) => (item.delta ?? 0) < 0)
    .sort((left, right) => (left.delta ?? 0) - (right.delta ?? 0))[0]
  const largestImprovement = [...changed]
    .filter((item) => (item.delta ?? 0) > 0)
    .sort((left, right) => (right.delta ?? 0) - (left.delta ?? 0))[0]
  const topIssue = input.issues[0]
  const systemicIssue = [...input.issues].sort(
    (left, right) => right.affectedAreaCount - left.affectedAreaCount || right.currentCount - left.currentCount,
  )[0]
  const biggestNew = input.attribution.newIssues[0]
  const biggestPersistent = input.attribution.persistentIssues[0]
  const declineDriver = input.attribution.declineDrivers[0]
  const improvementDriver = input.attribution.improvementDrivers[0]
  const noteParts = [
    lowest ? `${lowest.label}为当前优先范围` : "当前无下级范围可比较",
    declineDriver ? `${declineDriver.label}是主要下降驱动` : "未识别到下降驱动",
    systemicIssue ? `${systemicIssue.label}覆盖 ${systemicIssue.affectedAreaCount} 个小区` : "未识别到跨小区问题",
  ]

  return {
    headline: `当前 ${scoreText(input.overall.score)}，较 ${input.previousPeriodLabel} ${deltaText(input.overallDelta)}`,
    overallScore: input.overall.score,
    delta: input.overallDelta,
    completeness: input.overall.completeness,
    storeCount: input.storeCount,
    lowestScope: scopeText(lowest),
    highestScope: scopeText(highest),
    largestDecline: scopeText(largestDecline),
    largestImprovement: scopeText(largestImprovement),
    topIssue: topIssue ? `${topIssue.label}（${topIssue.currentCount} 家）` : "当前无失败项",
    systemicIssue: systemicIssue
      ? `${systemicIssue.label}（${systemicIssue.affectedAreaCount}/${systemicIssue.totalAreaCount} 个小区）`
      : "当前无跨小区问题",
    biggestNewIssue: biggestNew
      ? `${biggestNew.label}（新增 ${biggestNew.affectedStores.length} 家）`
      : "本期无新增问题",
    biggestPersistentIssue: biggestPersistent
      ? `${biggestPersistent.label}（持续 ${biggestPersistent.affectedStores.length} 家）`
      : "本期无持续问题",
    primaryDeclineDriver: declineDriver
      ? `${declineDriver.label}，涉及 ${declineDriver.affectedStores.length} 家门店`
      : "未识别到下降驱动",
    primaryImprovementDriver: improvementDriver
      ? `${improvementDriver.label}，${improvementDriver.affectedStores.length} 家门店恢复`
      : "未识别到改善驱动",
    attentionScope: lowest?.label ?? "当前范围",
    note: `${noteParts.join("；")}。${improvementDriver ? `${improvementDriver.label}出现恢复，可作为本期改善观察点。` : "本期未识别到恢复项。"}`,
    priorityScope: {
      label: "Priority Scope",
      value: lowest?.label ?? "当前范围",
      detail: lowest ? `${scoreText(lowest.score)} · ${deltaText(lowest.delta)}` : "暂无可比较范围",
    },
    declineSignal: {
      label: "Primary Decline Driver",
      value: declineDriver?.label ?? "未识别到下降驱动",
      detail: declineDriver ? `${declineDriver.affectedStores.length} 家门店受影响` : "按本期变化归因",
    },
    systemicSignal: {
      label: "Systemic Issue",
      value: systemicIssue?.label ?? "无跨小区问题",
      detail: systemicIssue
        ? `${systemicIssue.affectedAreaCount}/${systemicIssue.totalAreaCount} 个小区`
        : "当前范围未识别",
    },
    improvementSignal: {
      label: "Top Improvement",
      value: largestImprovement?.label ?? improvementDriver?.label ?? "未识别到改善范围",
      detail: largestImprovement
        ? deltaText(largestImprovement.delta)
        : improvementDriver
          ? `${improvementDriver.affectedStores.length} 家门店恢复`
          : "本期无恢复项",
    },
  }
}
