"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { ANALYTICS_PAGE_CONTAINER_CLASS_NAME } from "@/components/shared/analytics-layout";
import type { ActionsViewMode } from "@/data/contracts/actions";
import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import type { ActionAnalyticsQuery, ActionAnalyticsResult } from "@/data/contracts/action-analytics";
import { ActionsAnalytics } from "@/features/actions/actions-analytics";
import {
  ActionsDataTable,
  DEFAULT_ACTIONS_VIEW_MODE,
} from "@/features/actions/actions-data-table";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";

export type ActionsQueryAction = (input: {
  referenceDateIso: string;
  query: ActionsQuery;
}) => Promise<ActionsQueryResult>;

export type ActionsAnalyticsQueryAction = (input: {
  referenceDateIso: string;
  query: ActionAnalyticsQuery;
}) => Promise<ActionAnalyticsResult>;

export function ActionsPageContent({
  queryActions,
  queryActionsAnalytics,
}: {
  queryActions: ActionsQueryAction;
  queryActionsAnalytics: ActionsAnalyticsQueryAction;
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const [viewMode, setViewMode] =
    useState<ActionsViewMode>(DEFAULT_ACTIONS_VIEW_MODE);
  return (
    <PageContainer className={ANALYTICS_PAGE_CONTAINER_CLASS_NAME}>
      {filterContext === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成行动项数据，请调整筛选条件。
        </div>
      ) : (
        <div className="space-y-6">
          <ActionsAnalytics
            context={filterContext}
            referenceDateIso={referenceDateIso}
            queryActionsAnalytics={queryActionsAnalytics}
          />
          <ActionsDataTable
            context={filterContext}
            referenceDateIso={referenceDateIso}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            queryActions={queryActions}
          />
        </div>
      )}
    </PageContainer>
  );
}
