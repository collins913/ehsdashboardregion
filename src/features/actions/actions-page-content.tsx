"use client";

import { useMemo, useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import type {
  ActionsQueryResult,
  ActionsViewMode,
} from "@/data/contracts/actions";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import {
  createEhsRepository,
  type EhsRepository,
} from "@/data/repositories";
import {
  ActionsDataTable,
  DEFAULT_ACTIONS_VIEW_MODE,
} from "@/features/actions/actions-data-table";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";

type ActionsPageRepository = Pick<EhsRepository, "getActions">;

export function loadActionsPageData(
  context: KpiFilterContext | null,
  viewMode: ActionsViewMode,
  repository: ActionsPageRepository,
): ActionsQueryResult | null {
  return context === null
    ? null
    : repository.getActions({ context, viewMode });
}

export function ActionsPageContent() {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const [viewMode, setViewMode] =
    useState<ActionsViewMode>(DEFAULT_ACTIONS_VIEW_MODE);
  const repository = useMemo(
    () => createEhsRepository(new Date(referenceDateIso)),
    [referenceDateIso],
  );
  const result = useMemo(
    () => loadActionsPageData(filterContext, viewMode, repository),
    [filterContext, repository, viewMode],
  );

  return (
    <PageContainer>
      {result === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成行动项数据，请调整筛选条件。
        </div>
      ) : (
        <ActionsDataTable
          rows={result.items}
          availability={result.availability}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
    </PageContainer>
  );
}
