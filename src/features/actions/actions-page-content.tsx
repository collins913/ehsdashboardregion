"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import type { ActionsViewMode } from "@/data/contracts/actions";
import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import {
  ActionsDataTable,
  DEFAULT_ACTIONS_VIEW_MODE,
} from "@/features/actions/actions-data-table";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";

export type ActionsQueryAction = (input: {
  referenceDateIso: string;
  query: ActionsQuery;
}) => Promise<ActionsQueryResult>;

export function ActionsPageContent({
  queryActions,
}: {
  queryActions: ActionsQueryAction;
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const [viewMode, setViewMode] =
    useState<ActionsViewMode>(DEFAULT_ACTIONS_VIEW_MODE);
  return (
    <PageContainer>
      {filterContext === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成行动项数据，请调整筛选条件。
        </div>
      ) : (
        <ActionsDataTable
          context={filterContext}
          referenceDateIso={referenceDateIso}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          queryActions={queryActions}
        />
      )}
    </PageContainer>
  );
}
