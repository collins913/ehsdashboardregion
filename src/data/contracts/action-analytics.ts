import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import type { Month } from "@/types/ehs";

export interface ActionAnalyticsQuery {
  context: EhsFilterContext;
}

export interface ActionClosureAnalytics {
  closedOrCancelledCount: number;
  otherCount: number;
  closureRate: number | null;
}

export interface ActionMonthlyAnalytics {
  month: Month;
  actionCount: number;
}

export interface ActionAnalyticsResult {
  availability: DataAvailability;
  closure: ActionClosureAnalytics;
  monthly: readonly ActionMonthlyAnalytics[];
}
