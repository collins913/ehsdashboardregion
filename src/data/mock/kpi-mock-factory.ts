import type { KpiPeriod } from "@/data/contracts/kpi";
import {
  periodForMode,
  periodFromMonthRange,
} from "@/data/contracts/kpi-period";
import {
  createMockActionClosureRates,
  createMockActionRecords,
} from "@/data/mock/actions";
import { createMockDrillRecords } from "@/data/mock/drills";
import { createMockEventRecords } from "@/data/mock/events";
import { createMockInspectionRecords } from "@/data/mock/inspections";
import { createMockKpiCoverage } from "@/data/mock/kpi-coverage";
import { mockStores } from "@/data/mock/stores";
import { createMockTrainingRecords } from "@/data/mock/training";
import {
  createMockTakeChargeAnnualMetricContributions,
  createMockTakeChargeRecords,
  mockTakeChargeFieldDefinitions,
} from "@/data/mock/take-charge";
import type { Month } from "@/types/ehs";

function aggregateScopes(
  months: readonly [Month, ...Month[]],
): readonly KpiPeriod[] {
  const scopes: KpiPeriod[] = [];

  for (let start = 0; start < months.length; start += 1) {
    for (let end = start; end < months.length; end += 1) {
      const period = periodFromMonthRange(months[start], months[end]);

      if (period === null) {
        throw new Error("Unable to create KPI mock aggregate scope.");
      }

      scopes.push(period);
    }
  }

  return scopes;
}

export function createKpiMockData(referenceDate: Date) {
  const supportedPeriod = periodForMode("THIS_YEAR", referenceDate);
  const supportedMonths = supportedPeriod.includedMonths;
  const actionAggregateScopes = aggregateScopes(supportedMonths);

  return {
    supportedPeriod,
    supportedMonths,
    coverage: createMockKpiCoverage(
      mockStores.map(({ trtid }) => trtid),
      supportedPeriod,
      actionAggregateScopes,
    ),
    trainingRecords: createMockTrainingRecords(supportedMonths),
    drillRecords: createMockDrillRecords(supportedMonths),
    inspectionRecords: createMockInspectionRecords(supportedMonths),
    actionClosureRates: createMockActionClosureRates(
      supportedMonths,
      actionAggregateScopes,
    ),
    actionRecords: createMockActionRecords(supportedMonths),
    eventRecords: createMockEventRecords(supportedMonths),
    takeChargeRecords: createMockTakeChargeRecords(supportedMonths),
    takeChargeAnnualMetricContributions:
      createMockTakeChargeAnnualMetricContributions(
        Number(supportedMonths[0].slice(0, 4)),
      ),
    takeChargeFieldDefinitions: mockTakeChargeFieldDefinitions,
  } as const;
}
