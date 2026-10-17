"use client";
import { unwrapQueryOutcome } from "@/data/contracts/query-result";
import type { QueryOutcome } from "@/data/contracts/query-result";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import { ANALYTICS_PAGE_CONTAINER_CLASS_NAME } from "@/components/shared/analytics-layout";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import type { StoresQueryResult } from "@/data/contracts/stores";
import { storeScopeQueryKey } from "@/features/global-filters/global-filter-state";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { StoresDataTable } from "@/features/stores/stores-data-table";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

export type StoresQueryAction = (input: {
  referenceDateIso: string;
  query: EhsStoreScope;
}) => Promise<QueryOutcome<StoresQueryResult>>;

export async function loadStoresPageData(
  context: EhsStoreScope | null,
  referenceDateIso: string,
  query: StoresQueryAction,
): Promise<StoresQueryResult | null> {
  return context === null
    ? null
    : unwrapQueryOutcome(await query({ referenceDateIso, query: context }));
}

export function StoresPageContent({
  queryStores,
}: {
  queryStores: StoresQueryAction;
}) {
  const { storeScope, referenceDateIso } = useGlobalFilters();
  const queryKey = storeScopeQueryKey(storeScope);
  const load = useCallback(
    () => loadStoresPageData(storeScope, referenceDateIso, queryStores),
    [storeScope, queryStores, referenceDateIso],
  );
  const state = useLatestAsyncQuery(queryKey, storeScope ? load : null);
  const result =
    state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;

  return (
    <PageContainer className={ANALYTICS_PAGE_CONTAINER_CLASS_NAME}>
      {state.status === "IDLE" ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成门店数据，请调整筛选条件。
        </div>
      ) : (
        <>
          {state.status === "ERROR" ? (
            <AsyncQueryFeedback status="ERROR" errorCode={state.errorCode} />
          ) : null}
          <StoresDataTable
            rows={result?.items ?? []}
            fieldDefinitions={result?.fieldDefinitions}
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
