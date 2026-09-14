"use client";

import { useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import type { StoresQueryResult } from "@/data/contracts/stores";
import {
  createEhsRepository,
  type EhsRepository,
} from "@/data/repositories";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { StoresDataTable } from "@/features/stores/stores-data-table";

type StoresPageRepository = Pick<EhsRepository, "getStores">;

export function loadStoresPageData(
  context: KpiFilterContext | null,
  repository: StoresPageRepository,
): StoresQueryResult | null {
  return context === null ? null : repository.getStores({ context });
}

export function StoresPageContent() {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const repository = useMemo(
    () => createEhsRepository(new Date(referenceDateIso)),
    [referenceDateIso],
  );
  const result = useMemo(
    () => loadStoresPageData(filterContext, repository),
    [filterContext, repository],
  );

  return (
    <PageContainer>
      {result === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成门店数据，请调整筛选条件。
        </div>
      ) : (
        <StoresDataTable rows={result.items} />
      )}
    </PageContainer>
  );
}
