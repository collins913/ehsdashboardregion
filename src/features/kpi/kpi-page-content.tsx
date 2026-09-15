"use client";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import type { KpiActionDrilldownQuery } from "@/features/kpi/kpi-action-drilldown";
import { KpiDataTable } from "@/features/kpi/kpi-data-table";
import type { KpiRow } from "@/features/kpi/types";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

export type KpiRowsQuery = (input: {
  referenceDateIso: string;
  query: EhsFilterContext;
}) => Promise<readonly KpiRow[]>;

export async function loadKpiPageRows(
  context: EhsFilterContext | null,
  referenceDateIso: string,
  query: KpiRowsQuery,
): Promise<readonly KpiRow[] | null> {
  if (context === null) {
    return null;
  }

  return query({ referenceDateIso, query: context });
}

export function KpiPageContent({
  queryRows,
  queryActions,
}: {
  queryRows: KpiRowsQuery;
  queryActions: KpiActionDrilldownQuery;
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const queryKey = filterContext
    ? JSON.stringify([referenceDateIso, filterContext])
    : null;
  const load = useCallback(
    () => loadKpiPageRows(filterContext, referenceDateIso, queryRows),
    [filterContext, queryRows, referenceDateIso],
  );
  const state = useLatestAsyncQuery(queryKey, filterContext ? load : null);

  return (
    <PageContainer>
      {state.status === "IDLE" ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成 KPI 数据，请调整筛选条件。
        </div>
      ) : (
        <>
          {state.status === "ERROR" ? (
            <AsyncQueryFeedback status="ERROR" />
          ) : null}
          <KpiDataTable
            rows={state.status === "SUCCESS" ? state.data ?? [] : []}
            context={filterContext!}
            referenceDateIso={referenceDateIso}
            queryActions={queryActions}
            queryStatus={
              state.status === "SUCCESS" ? "READY" : state.status
            }
          />
        </>
      )}
    </PageContainer>
  );
}
