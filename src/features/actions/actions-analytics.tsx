"use client";

import { useCallback, useMemo } from "react";
import { AnalyticsClosureRadial } from "@/components/shared/analytics-closure-radial";
import { AnalyticsCountTrend } from "@/components/shared/analytics-count-trend";
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { ANALYTICS_CARD_HEIGHT_CLASS_NAME } from "@/components/shared/analytics-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionAnalyticsQuery, ActionAnalyticsResult } from "@/data/contracts/action-analytics";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

type QueryAction = (input: {
  referenceDateIso: string;
  query: ActionAnalyticsQuery;
}) => Promise<ActionAnalyticsResult>;

function ActionsAnalyticsPlaceholder({
  loading = false,
  message = "数据查询失败，请稍后重试。",
}: {
  loading?: boolean;
  message?: string;
}) {
  return (
    <section className="space-y-3" aria-label="Actions Analytics" aria-busy={loading || undefined}>
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 xl:col-span-4`}>
        <CardHeader className="px-4 py-4"><CardTitle>关闭情况</CardTitle></CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 pt-4">
          {loading ? <Skeleton className="h-28 w-56" /> : <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 xl:col-span-8`}>
        <CardHeader className="px-4 py-4"><CardTitle>行动项趋势</CardTitle></CardHeader>
        <CardContent className="flex min-h-0 flex-1 items-center px-4 pt-4">
          {loading ? <Skeleton className="h-40 w-full" /> : <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
      </div>
    </section>
  );
}

export function ActionsAnalytics({
  context,
  referenceDateIso,
  queryActionsAnalytics,
}: {
  context: EhsFilterContext;
  referenceDateIso: string;
  queryActionsAnalytics: QueryAction;
}) {
  const queryKey = JSON.stringify([referenceDateIso, context]);
  const load = useCallback(
    () => queryActionsAnalytics({ referenceDateIso, query: { context } }),
    [context, queryActionsAnalytics, referenceDateIso],
  );
  const state = useLatestAsyncQuery(queryKey, load);
  const result = state.status === "SUCCESS"
    ? state.data
    : state.status === "LOADING"
      ? state.resolved?.data ?? null
      : null;
  const trendData = useMemo(
    () => result?.monthly.map(({ month, actionCount }) => ({ month, count: actionCount })) ?? [],
    [result],
  );
  if (state.status === "ERROR") {
    return state.resolved ? <ActionsAnalyticsPlaceholder /> : <AsyncQueryFeedback status="ERROR" />;
  }
  if (result === null) return <ActionsAnalyticsPlaceholder loading />;

  if (result.availability === "UNAVAILABLE") {
    return <ActionsAnalyticsPlaceholder message="数据不可用" />;
  }

  return (
    <section aria-label="Actions Analytics" aria-busy={state.status === "LOADING" || undefined} className="relative space-y-3">
      <AnalyticsRefreshIndicator refreshing={state.status === "LOADING" && state.resolved !== null} />
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="h-full xl:col-span-4">
          <AnalyticsClosureRadial
            title="关闭情况"
            numeratorCount={result.closure.closedOrCancelledCount}
            otherCount={result.closure.otherCount}
            rate={result.closure.closureRate}
            rateLabel="关闭率"
            numeratorLabel="已关闭或取消"
            otherLabel="未关闭或未知"
          />
        </div>
        <div className="h-full xl:col-span-8">
          <AnalyticsCountTrend
            title="行动项趋势"
            data={trendData}
            valueLabel="行动项数量"
            toolbar={result.availability === "INCOMPLETE" ? <DataAvailabilityDisplay availability="INCOMPLETE" /> : undefined}
          />
        </div>
      </div>
    </section>
  );
}
