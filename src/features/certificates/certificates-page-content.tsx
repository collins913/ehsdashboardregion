"use client";

import { useCallback, useMemo } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import type { CertificatesQueryResult } from "@/data/contracts/certificates";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import { CertificatesDataTable } from "./certificates-data-table";
import { certificatesQueryKey, toCertificatesTableRows } from "./certificates-view-model";

export type CertificatesQueryAction = (input: { referenceDateIso: string; query: EhsFilterContext }) => Promise<CertificatesQueryResult>;

export async function loadCertificatesPageData(context: EhsFilterContext | null, referenceDateIso: string, query: CertificatesQueryAction) {
  return context ? query({ referenceDateIso, query: context }) : null;
}

export function CertificatesPageContent({ queryCertificates }: { queryCertificates: CertificatesQueryAction }) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const queryKey = certificatesQueryKey(filterContext, referenceDateIso);
  const load = useCallback(() => loadCertificatesPageData(filterContext, referenceDateIso, queryCertificates), [filterContext, referenceDateIso, queryCertificates]);
  const state = useLatestAsyncQuery(queryKey, filterContext ? load : null);
  const result = state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;
  const rows = useMemo(() => toCertificatesTableRows(result?.items ?? []), [result]);
  return (
    <PageContainer>
      {state.status === "IDLE" ? (
        <p className="text-sm text-muted-foreground">当前筛选条件尚不能生成证件数据，请调整筛选条件。</p>
      ) : (
        <>
          {state.status === "ERROR" ? <AsyncQueryFeedback status="ERROR" /> : null}
          <CertificatesDataTable rows={rows} queryKey={queryKey ?? ""} queryStatus={state.status === "SUCCESS" ? "READY" : state.status} />
        </>
      )}
    </PageContainer>
  );
}
