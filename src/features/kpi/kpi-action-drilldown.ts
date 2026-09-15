import type {
  ActionsQuery,
  ActionsQueryResult,
} from "@/data/contracts/actions";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { StoreId } from "@/types/ehs";

export type KpiActionDrilldownQuery = (input: {
  referenceDateIso: string;
  query: ActionsQuery;
}) => Promise<ActionsQueryResult>;

export function buildKpiActionDrilldownQuery(
  context: EhsFilterContext,
  storeId: StoreId,
): ActionsQuery {
  return {
    context: {
      ...context,
      store: { kind: "INCLUDE", values: [storeId] },
    },
    viewMode: "OPEN_ONLY",
    pageIndex: 0,
    pageSize: Number.MAX_SAFE_INTEGER,
  };
}
