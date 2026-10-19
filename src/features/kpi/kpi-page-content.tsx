"use client";
import { unwrapQueryOutcome, type QueryOutcome } from "@/data/contracts/query-result";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityNotice } from "@/components/shared/data-availability-notice";
import { PageContainer } from "@/components/shared/page-container";
import { ANALYTICS_PAGE_CONTAINER_CLASS_NAME } from "@/components/shared/analytics-layout";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import type { KpiActionDrilldownQuery } from "@/features/kpi/kpi-action-drilldown";
import type { KpiDetailQueries } from "@/features/kpi/kpi-detail-sheet";
import { KpiDataTable } from "@/features/kpi/kpi-data-table";
import type { KpiPageResult } from "@/features/kpi/types";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

export type KpiRowsQuery = (input: {
  referenceDateIso: string;
  query: EhsFilterContext;
}) => Promise<QueryOutcome<KpiPageResult>>;

export async function loadKpiPageRows(
  context: EhsFilterContext | null,
  referenceDateIso: string,
  query: KpiRowsQuery,
): Promise<KpiPageResult | null> {
  if (context === null) {
    return null;
  }

  return unwrapQueryOutcome(await query({ referenceDateIso, query: context }));
}

export function KpiPageContent({
  queryRows,
  queryActions,
  queryKpiDetails,
}: {
  queryRows: KpiRowsQuery;
  queryActions: KpiActionDrilldownQuery;
  queryKpiDetails: KpiDetailQueries;
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
  const result = state.status === "SUCCESS"
    ? state.data
    : state.status === "LOADING" && state.resolved?.key === queryKey
      ? state.resolved.data
      : null;

  return (
    <PageContainer className={ANALYTICS_PAGE_CONTAINER_CLASS_NAME}>
      {state.status === "IDLE" ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成 KPI 数据，请调整筛选条件。
        </div>
      ) : (
        <>
          {state.status === "ERROR" ? (
            <AsyncQueryFeedback status="ERROR" errorCode={state.errorCode} diagnostics={state.diagnostics} />
          ) : null}
          {result ? <DataAvailabilityNotice availability={result.availability} subject="KPI " /> : null}
          <KpiDataTable
            rows={state.status === "SUCCESS" ? state.data?.rows ?? [] : []}
            context={filterContext!}
            referenceDateIso={referenceDateIso}
            queryActions={queryActions}
            queryKpiDetails={queryKpiDetails}
            queryStatus={
              state.status === "SUCCESS" ? "READY" : state.status
            }
          />
        </>
      )}
    </PageContainer>
  );
}
