import type { KpiPeriod } from "@/data/contracts/kpi";
import type { StoreId } from "@/types/ehs";

export interface KpiMockCoverage {
  storeIds: readonly StoreId[];
  period: KpiPeriod;
  sourceCoverage: {
    training: "COMPLETE";
    drills: "COMPLETE";
    inspections: "COMPLETE";
    actionClosureRates: "COMPLETE";
    actions: "COMPLETE";
    events: "COMPLETE";
  };
  actionAggregateScopes: readonly KpiPeriod[];
}

export function createMockKpiCoverage(
  storeIds: readonly StoreId[],
  period: KpiPeriod,
  actionAggregateScopes: readonly KpiPeriod[],
): KpiMockCoverage {
  return {
    storeIds,
    period,
    sourceCoverage: {
      training: "COMPLETE",
      drills: "COMPLETE",
      inspections: "COMPLETE",
      actionClosureRates: "COMPLETE",
      actions: "COMPLETE",
      events: "COMPLETE",
    },
    actionAggregateScopes,
  };
}
