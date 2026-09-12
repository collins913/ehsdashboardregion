import type { NormalizedActionRecord } from "@/data/contracts/action-record";
import type { DataSet, KpiFilterContext } from "@/data/contracts/kpi";

export type { NormalizedActionRecord } from "@/data/contracts/action-record";

export type ActionsViewMode = "OPEN_ONLY" | "ALL";

export interface ActionsQuery {
  context: KpiFilterContext;
  viewMode: ActionsViewMode;
}

export type ActionsQueryResult = DataSet<NormalizedActionRecord>;
