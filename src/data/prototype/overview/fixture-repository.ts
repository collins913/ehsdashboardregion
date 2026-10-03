import {
  prototypeOverviewAreaScenarioIndex,
  prototypeOverviewCurrentPeriodLabel,
  prototypeOverviewPreviousPeriodLabel,
  prototypeOverviewScoreRuleVersion,
} from "@/data/mock/overview-demo/overview-demo-data"
import {
  prototypeOverviewMonthlyHistoryPeriods,
  prototypeOverviewExpandedCurrentStores,
  prototypeOverviewExpandedPreviousStores,
} from "@/data/mock/overview-demo/overview-demo-history"

export function getPrototypeOverviewFixture() {
  return {
    areaScenarioIndex: prototypeOverviewAreaScenarioIndex,
    currentPeriodLabel: prototypeOverviewCurrentPeriodLabel,
    currentStores: prototypeOverviewExpandedCurrentStores,
    previousPeriodLabel: prototypeOverviewPreviousPeriodLabel,
    previousStores: prototypeOverviewExpandedPreviousStores,
    monthlyHistoryPeriods: prototypeOverviewMonthlyHistoryPeriods,
    scoreRuleVersion: prototypeOverviewScoreRuleVersion,
  } as const
}
