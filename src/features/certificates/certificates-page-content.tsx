"use client";

import { useCallback, useMemo } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import { ANALYTICS_PAGE_CONTAINER_CLASS_NAME } from "@/components/shared/analytics-layout";
import type { CertificatesPageQueryResult } from "@/data/contracts/certificates";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import { CertificateOverview, CertificateOverviewPlaceholder } from "./certificate-overview";
import { CertificatesDataTable } from "./certificates-data-table";
import { certificatesQueryKey, toCertificatesTableRows } from "./certificates-view-model";

export type CertificatesQueryAction = (input: { referenceDateIso: string; query: EhsStoreScope }) => Promise<CertificatesPageQueryResult>;

export async function loadCertificatesPageData(context: EhsStoreScope | null, referenceDateIso: string, query: CertificatesQueryAction) {
  return context ? query({ referenceDateIso, query: context }) : null;
}

export function CertificatesPageContent({ queryCertificates }: { queryCertificates: CertificatesQueryAction }) {
  const { storeScope, referenceDateIso } = useGlobalFilters();
  const queryKey = certificatesQueryKey(storeScope, referenceDateIso);
  const load = useCallback(() => loadCertificatesPageData(storeScope, referenceDateIso, queryCertificates), [storeScope, referenceDateIso, queryCertificates]);
  const state = useLatestAsyncQuery(queryKey, storeScope ? load : null);
  const result = state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;
  const overviewResult = state.status === "SUCCESS" || state.status === "LOADING" ? result : null;
  const rows = useMemo(() => toCertificatesTableRows(result?.items ?? []), [result]);
  return (
    <PageContainer className={ANALYTICS_PAGE_CONTAINER_CLASS_NAME}>
      <div className="space-y-6">
        {state.status === "IDLE" ? (
          <p className="text-sm text-muted-foreground">当前筛选条件尚不能生成证件数据，请调整筛选条件。</p>
        ) : (
          <>
            {state.status === "ERROR" && !state.resolved ? <AsyncQueryFeedback status="ERROR" /> : null}
            {state.status === "LOADING" && overviewResult === null ? <CertificateOverviewPlaceholder loading /> : null}
            {state.status === "ERROR" && state.resolved ? <CertificateOverviewPlaceholder /> : null}
            {overviewResult ? <CertificateOverview availability={overviewResult.availability} overview={overviewResult.overview} refreshing={state.status === "LOADING"} /> : null}
            <CertificatesDataTable rows={rows} queryKey={queryKey ?? ""} queryStatus={state.status === "SUCCESS" ? "READY" : state.status} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
