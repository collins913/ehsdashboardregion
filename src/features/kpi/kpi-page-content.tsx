"use client";

import { useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import {
  createEhsRepository,
  type EhsRepository,
} from "@/data/repositories";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { KpiDataTable } from "@/features/kpi/kpi-data-table";
import type { KpiRow } from "@/features/kpi/types";

type KpiPageRepository = Pick<EhsRepository, "getKpiData">;

export function loadKpiPageRows(
  context: KpiFilterContext | null,
  repository: KpiPageRepository,
): readonly KpiRow[] | null {
  if (context === null) {
    return null;
  }

  return buildKpiRows(context, repository.getKpiData(context));
}

export function KpiPageContent() {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const repository = useMemo(
    () => createEhsRepository(new Date(referenceDateIso)),
    [referenceDateIso],
  );
  const rows = useMemo(
    () => loadKpiPageRows(filterContext, repository),
    [filterContext, repository],
  );

  return (
    <PageContainer>
      {rows === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成 KPI 数据，请调整筛选条件。
        </div>
      ) : (
        <KpiDataTable rows={rows} />
      )}
    </PageContainer>
  );
}
