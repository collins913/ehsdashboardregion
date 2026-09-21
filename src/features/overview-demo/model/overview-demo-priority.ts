import { overviewDemoScoredItems } from "./overview-demo-score"
import type {
  OverviewDemoAttribution,
  OverviewDemoIssueView,
  OverviewDemoPriorityInvestigation,
} from "./overview-demo-types"

export function buildOverviewDemoPriorityInvestigations(input: {
  issues: readonly OverviewDemoIssueView[]
  attribution: OverviewDemoAttribution
}): OverviewDemoPriorityInvestigation[] {
  const declineKeys = new Set(input.attribution.declineDrivers.map((item) => item.metricKey))

  return input.issues
    .filter((issue) => issue.currentCount > 0)
    .map((issue) => {
      const definition = overviewDemoScoredItems.find((item) => item.id === issue.id)!
      const isDeclineDriver = declineKeys.has(issue.id)
      const order =
        issue.persistentIssueCount > 0 && isDeclineDriver
          ? 0
          : issue.newIssueCount > 0 && isDeclineDriver
            ? 1
            : issue.persistentIssueCount > 0
              ? 2
              : issue.newIssueCount > 0
                ? 3
                : 4
      const reason =
        order === 0
          ? "持续存在且属于本期下降驱动"
          : order === 1
            ? "本期新增且属于本期下降驱动"
            : order === 2
              ? "跨周期持续存在"
              : order === 3
                ? "本期新增"
                : "当前问题"

      return {
        order,
        issueKey: issue.id,
        label: issue.label,
        dimension: definition.dimension,
        reason,
        affectedStores: issue.currentCount,
        newCount: issue.newIssueCount,
        persistentCount: issue.persistentIssueCount,
        routeTarget: issue.route,
      }
    })
    .sort(
      (left, right) =>
        left.order - right.order ||
        right.affectedStores - left.affectedStores ||
        (left.issueKey < right.issueKey ? -1 : left.issueKey > right.issueKey ? 1 : 0),
    )
    .map(({ order: _order, ...item }) => item)
}
