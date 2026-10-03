import type { EhsFilterContext } from "@/data/contracts/kpi";

export type PrototypeOverviewPeriodMode = "THIS_YEAR" | "THIS_QUARTER" | "THIS_MONTH" | "CUSTOM";

export interface PrototypeOverviewQuery {
  context: EhsFilterContext;
  periodMode: PrototypeOverviewPeriodMode;
}
