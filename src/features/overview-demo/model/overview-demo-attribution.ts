import { overviewDemoScoredItems } from "./overview-demo-score"
import type {
  OverviewDemoAttribution,
  OverviewDemoAttributionItem,
  OverviewDemoOutcome,
  OverviewDemoStoreIdentity,
  OverviewDemoStoreSnapshot,
  OverviewDemoScopeChangeSummary,
  OverviewDemoTransition,
} from "./overview-demo-types"

function metricLabel(metricKey: OverviewDemoAttributionItem["metricKey"]): string {
  return overviewDemoScoredItems.find((item) => item.id === metricKey)?.label ?? metricKey
}

export function buildOverviewDemoScopeChangeSummary(
  delta: number | null,
  attribution: OverviewDemoAttribution,
): OverviewDemoScopeChangeSummary {
  const concern = attribution.persistentIssues[0] ?? attribution.newIssues[0]
  const currentConcern = concern ? `当前关注问题：${concern.label}` : "无当前关注问题"

  if (delta === null) return { mainChange: "变化不可用", currentConcern, changeKind: "UNAVAILABLE" }
  if (delta > 0) {
    const driver = attribution.improvementDrivers[0]
    return {
      mainChange: driver ? `主要改善：${metricLabel(driver.metricKey)} 已恢复` : "主要改善：未识别到恢复项",
      currentConcern,
      changeKind: "IMPROVEMENT",
    }
  }
  if (delta < 0) {
    const driver = attribution.declineDrivers[0]
    return {
      mainChange: driver ? `主要下降：${driver.label}` : "主要下降：未识别到新增问题",
      currentConcern,
      changeKind: "DECLINE",
    }
  }
  return { mainChange: "持平", currentConcern, changeKind: "STABLE" }
}

export function classifyOverviewDemoTransition(
  previous: OverviewDemoOutcome,
  current: OverviewDemoOutcome,
): OverviewDemoTransition {
  if (previous === "MISSING" || current === "MISSING") return "MISSING"
  if (previous === "PASS" && current === "FAIL") return "NEW_ISSUE"
  if (previous === "FAIL" && current === "FAIL") return "PERSISTENT_ISSUE"
  if (previous === "FAIL" && current === "PASS") return "RECOVERED"
  return "STABLE_GOOD"
}

function sortAttribution(items: OverviewDemoAttributionItem[]): OverviewDemoAttributionItem[] {
  return items.sort(
    (left, right) =>
      right.affectedStores.length - left.affectedStores.length || (left.metricKey < right.metricKey ? -1 : left.metricKey > right.metricKey ? 1 : 0),
  )
}

export function buildOverviewDemoAttribution(input: {
  current: readonly OverviewDemoStoreSnapshot[]
  previous: readonly OverviewDemoStoreSnapshot[]
  identities: readonly OverviewDemoStoreIdentity[]
}): OverviewDemoAttribution {
  const previousByStore = new Map(input.previous.map((store) => [store.storeId, store]))
  const identityByStore = new Map(input.identities.map((store) => [store.storeId, store]))
  const grouped = new Map<string, OverviewDemoAttributionItem>()

  for (const currentStore of input.current) {
    const previousStore = previousByStore.get(currentStore.storeId)
    const identity = identityByStore.get(currentStore.storeId)
    if (!previousStore || !identity) continue

    for (const metric of overviewDemoScoredItems) {
      const previousResult = previousStore.outcomes[metric.id]
      const currentResult = currentStore.outcomes[metric.id]
      const transition = classifyOverviewDemoTransition(previousResult, currentResult)
      const key = `${metric.id}:${previousResult}:${currentResult}`
      const existing = grouped.get(key)
      if (existing) {
        existing.affectedStores.push(identity)
        if (!existing.affectedAreas.includes(identity.area)) existing.affectedAreas.push(identity.area)
        continue
      }

      grouped.set(key, {
        metricKey: metric.id,
        label: metric.issueLabel,
        dimension: metric.dimension,
        transition,
        previousResult,
        currentResult,
        affectedStores: [identity],
        affectedAreas: [identity.area],
        impactDirection:
          transition === "NEW_ISSUE"
            ? "NEGATIVE"
            : transition === "RECOVERED"
              ? "POSITIVE"
              : "NEUTRAL",
      })
    }
  }

  const all = [...grouped.values()]
  const pick = (transition: OverviewDemoTransition) =>
    sortAttribution(all.filter((item) => item.transition === transition))

  const newIssues = pick("NEW_ISSUE")
  const recovered = pick("RECOVERED")

  return {
    newIssues,
    persistentIssues: pick("PERSISTENT_ISSUE"),
    recovered,
    stableGood: pick("STABLE_GOOD"),
    missing: pick("MISSING"),
    declineDrivers: newIssues,
    improvementDrivers: recovered,
  }
}
