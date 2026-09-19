import {
  overviewDemoAreaScenarioIndex,
  overviewDemoCurrentPeriodLabel,
  overviewDemoCurrentStores,
  overviewDemoPreviousPeriodLabel,
  overviewDemoScoreRuleVersion,
} from "../../../data/mock/overview-demo/overview-demo-data"
import {
  overviewDemoHistoryPeriods,
  overviewDemoPreviousStores,
} from "../../../data/mock/overview-demo/overview-demo-history"

export function getOverviewDemoFixture() {
  return {
    areaScenarioIndex: overviewDemoAreaScenarioIndex,
    currentPeriodLabel: overviewDemoCurrentPeriodLabel,
    currentStores: overviewDemoCurrentStores,
    previousPeriodLabel: overviewDemoPreviousPeriodLabel,
    previousStores: overviewDemoPreviousStores,
    historyPeriods: overviewDemoHistoryPeriods,
    scoreRuleVersion: overviewDemoScoreRuleVersion,
  } as const
}
