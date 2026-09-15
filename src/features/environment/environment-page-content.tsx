"use client";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import type { EnvironmentQueryResult } from "@/data/contracts/environment";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import { EnvironmentDataTable } from "./environment-data-table";
import { environmentQueryKey } from "./environment-view-model";

export type EnvironmentQueryAction = (input: { referenceDateIso: string; query: EhsStoreScope }) => Promise<EnvironmentQueryResult>;

export async function loadEnvironmentPageData(context: EhsStoreScope | null, referenceDateIso: string, query: EnvironmentQueryAction) {
  return context ? query({ referenceDateIso, query: context }) : null;
}

export function EnvironmentPageContent({ queryEnvironment }: { queryEnvironment: EnvironmentQueryAction }) {
  const { storeScope, referenceDateIso } = useGlobalFilters();
  const queryKey = environmentQueryKey(storeScope, referenceDateIso);
  const load = useCallback(() => loadEnvironmentPageData(storeScope, referenceDateIso, queryEnvironment), [storeScope, referenceDateIso, queryEnvironment]);
  const state = useLatestAsyncQuery(queryKey, storeScope ? load : null);
  const result = state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;
  return (
    <PageContainer>
      {state.status === "IDLE" ? (
        <p className="text-sm text-muted-foreground">当前筛选条件尚不能生成环境数据，请调整筛选条件。</p>
      ) : (
        <>
          {state.status === "ERROR" ? <AsyncQueryFeedback status="ERROR" /> : null}
          <EnvironmentDataTable rows={result?.items ?? []} queryKey={queryKey ?? ""} queryStatus={state.status === "SUCCESS" ? "READY" : state.status} />
        </>
      )}
    </PageContainer>
  );
}
