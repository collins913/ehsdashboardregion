import { overviewDemoScoredItems } from "./overview-demo-score"
import type {
  OverviewDemoAttribution,
  OverviewDemoIssueView,
  OverviewDemoStoreIdentity,
  OverviewDemoStoreSnapshot,
} from "./overview-demo-types"

function roundPercent(value: number): number {
  return Math.round(value * 100)
}

export function calculateOverviewDemoPersistenceRate(
  persistentIssueCount: number,
  currentCount: number,
): number | null {
  return currentCount === 0 ? null : roundPercent(persistentIssueCount / currentCount)
}

export function buildOverviewDemoIssueIntelligence(input: {
  current: readonly OverviewDemoStoreSnapshot[]
  previous: readonly OverviewDemoStoreSnapshot[]
  identities: readonly OverviewDemoStoreIdentity[]
  attribution: OverviewDemoAttribution
}): OverviewDemoIssueView[] {
  const identityByStore = new Map(input.identities.map((store) => [store.storeId, store]))
  const totalAreaCount = new Set(input.identities.map((store) => store.area)).size

  return overviewDemoScoredItems
    .map((metric) => {
      const affectedStores = input.current.flatMap((store) => {
        const identity = identityByStore.get(store.storeId)
        return store.outcomes[metric.id] === "FAIL" && identity ? [identity] : []
      })
      const previousCount = input.previous.filter((store) => store.outcomes[metric.id] === "FAIL").length
      const lifecycleCount = (list: OverviewDemoAttribution["newIssues"]) =>
        list
          .filter((item) => item.metricKey === metric.id)
          .reduce((total, item) => total + item.affectedStores.length, 0)
      const areaCounts = new Map<string, number>()
      for (const store of affectedStores) areaCounts.set(store.area, (areaCounts.get(store.area) ?? 0) + 1)
      const areaDistribution = [...areaCounts.entries()]
        .map(([area, count]) => ({ area, count, share: roundPercent(count / affectedStores.length) }))
        .sort((left, right) => right.count - left.count || (left.area < right.area ? -1 : left.area > right.area ? 1 : 0))
      const shareAt = (count: number) =>
        affectedStores.length === 0
          ? 0
          : roundPercent(
              areaDistribution.slice(0, count).reduce((total, item) => total + item.count, 0) /
                affectedStores.length,
            )
      const newIssueCount = lifecycleCount(input.attribution.newIssues)
      const persistentIssueCount = lifecycleCount(input.attribution.persistentIssues)
      const recoveredCount = lifecycleCount(input.attribution.recovered)
      const leadingArea = areaDistribution[0]

      return {
        id: metric.id,
        label: metric.issueLabel,
        route: metric.route,
        currentCount: affectedStores.length,
        previousCount,
        delta: affectedStores.length - previousCount,
        newIssueCount,
        persistentIssueCount,
        persistenceRate: calculateOverviewDemoPersistenceRate(persistentIssueCount, affectedStores.length),
        recoveredCount,
        affectedAreaCount: areaDistribution.length,
        totalAreaCount,
        topAreaShare: shareAt(1),
        top2AreaShare: shareAt(2),
        top3AreaShare: shareAt(3),
        areaDistribution,
        affectedStores,
        conclusion: leadingArea
          ? `${leadingArea.area} 占当前问题门店 ${leadingArea.share}%；本期新增 ${newIssueCount}，持续 ${persistentIssueCount}。`
          : `当前无失败门店；本期恢复 ${recoveredCount}。`,
      }
    })
    .filter((issue) => issue.currentCount > 0 || issue.previousCount > 0)
    .sort(
      (left, right) =>
        right.currentCount - left.currentCount ||
        right.affectedAreaCount - left.affectedAreaCount ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    )
}
