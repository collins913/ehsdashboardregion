"use client";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { StoresQueryResult } from "@/data/contracts/stores";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { StoresDataTable } from "@/features/stores/stores-data-table";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

export type StoresQueryAction = (input: {
  referenceDateIso: string;
  query: EhsFilterContext;
}) => Promise<StoresQueryResult>;

export async function loadStoresPageData(
  context: EhsFilterContext | null,
  referenceDateIso: string,
  query: StoresQueryAction,
): Promise<StoresQueryResult | null> {
  return context === null
    ? null
    : query({ referenceDateIso, query: context });
}

export function StoresPageContent({
  queryStores,
}: {
  queryStores: StoresQueryAction;
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const queryKey = filterContext
    ? JSON.stringify([referenceDateIso, filterContext])
    : null;
  const load = useCallback(
    () => loadStoresPageData(filterContext, referenceDateIso, queryStores),
    [filterContext, queryStores, referenceDateIso],
  );
  const state = useLatestAsyncQuery(queryKey, filterContext ? load : null);
  const result =
    state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;

  return (
    <PageContainer>
      {state.status === "IDLE" ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成门店数据，请调整筛选条件。
        </div>
      ) : (
        <>
          {state.status === "ERROR" ? (
            <AsyncQueryFeedback status="ERROR" />
          ) : null}
          <StoresDataTable
            rows={result?.items ?? []}
            queryKey={queryKey ?? ""}
            queryStatus={
              state.status === "SUCCESS" ? "READY" : state.status
            }
          />
        </>
      )}
    </PageContainer>
  );
}
