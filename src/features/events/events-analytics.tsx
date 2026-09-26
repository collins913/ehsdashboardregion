"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { useAnalyticsChartAnimationEnabled } from "@/components/shared/use-analytics-motion";
import { AnalyticsClosureRadial } from "@/components/shared/analytics-closure-radial";
import { AnalyticsCountTrend } from "@/components/shared/analytics-count-trend";
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator";
import { FilterSelect } from "@/components/shared/filter-select";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { ANALYTICS_CHART_ANIMATION_DURATION, ANALYTICS_CARD_HEIGHT_CLASS_NAME } from "@/components/shared/analytics-layout";
import type {
  EventAnalyticsQuery,
  EventAnalyticsResult,
} from "@/data/contracts/event-analytics";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

type QueryAction = (input: {
  referenceDateIso: string;
  query: EventAnalyticsQuery;
}) => Promise<EventAnalyticsResult>;

const chartConfig = {
  eventCount: { label: "事件数量", color: "var(--analytics-primary)" },
} satisfies ChartConfig;

const EVENT_TYPE_COLORS = [
  "var(--analytics-series-1)",
  "var(--analytics-series-2)",
  "var(--analytics-series-3)",
  "var(--analytics-series-4)",
  "var(--analytics-series-5)",
  "var(--analytics-series-6)",
] as const;

function EventTypeDonut({ result }: { result: EventAnalyticsResult }) {
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();
  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-3 py-4`}>
      <CardHeader className="items-center px-4 pb-0">
        <CardTitle>类型分布</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center px-4">
        <div className="relative mx-auto size-48">
          <ChartContainer config={chartConfig} className="size-full aspect-square">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="eventType" />} />
              <Pie data={result.byType} dataKey="count" nameKey="eventType" innerRadius={60} strokeWidth={5} isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out">
                {result.byType.map((item, index) => (
                  <Cell
                    key={`${item.eventType}-${index}`}
                    fill={EVENT_TYPE_COLORS[index] ?? EVENT_TYPE_COLORS[index % EVENT_TYPE_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" role="img" aria-label={`${result.totalCount.toLocaleString()} 个事件`}>
            <span className="text-3xl font-bold leading-none text-foreground"><AnimatedNumber value={result.totalCount} /></span>
            <span className="text-sm leading-6 text-muted-foreground">事件</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventsAnalyticsPlaceholder({
  loading = false,
  message = "数据查询失败，请稍后重试。",
}: {
  loading?: boolean;
  message?: string;
}) {
  return (
    <section className="space-y-3" aria-label="Events Analytics" aria-busy={loading || undefined}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 md:col-span-1 xl:col-span-3`}>
        <CardHeader className="px-4 py-4"><CardTitle>类型分布</CardTitle></CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 pt-4">{loading ? <Skeleton className="size-44 rounded-full" /> : <p className="text-sm text-muted-foreground">{message}</p>}</CardContent>
      </Card>
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 md:col-span-1 xl:col-span-3`}>
        <CardHeader className="px-4 py-4"><CardTitle>关闭情况</CardTitle></CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 pt-4">{loading ? <Skeleton className="h-28 w-56" /> : <p className="text-sm text-muted-foreground">{message}</p>}</CardContent>
      </Card>
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 md:col-span-2 xl:col-span-6`}>
        <CardHeader className="px-4 py-4"><CardTitle>事件趋势</CardTitle></CardHeader>
        <CardContent className="flex min-h-0 flex-1 items-center px-4 pt-4">{loading ? <Skeleton className="h-40 w-full" /> : <p className="text-sm text-muted-foreground">{message}</p>}</CardContent>
      </Card>
      </div>
    </section>
  );
}

export function EventsAnalytics({
  context,
  referenceDateIso,
  queryEventsAnalytics,
}: {
  context: EhsFilterContext;
  referenceDateIso: string;
  queryEventsAnalytics: QueryAction;
}) {
  const [selectedTrendKey, setSelectedTrendKey] = useState("ALL");
  const queryKey = JSON.stringify([referenceDateIso, context]);
  const load = useCallback(
    () => queryEventsAnalytics({ referenceDateIso, query: { context } }),
    [context, queryEventsAnalytics, referenceDateIso],
  );
  const state = useLatestAsyncQuery(queryKey, load);
  const result = state.status === "SUCCESS"
    ? state.data
    : state.status === "LOADING"
      ? state.resolved?.data ?? null
      : null;
  const allTrendSeries = result?.trendSeries.find((series) => series.key === "ALL");
  const resolvedTrendKey = result?.trendSeries.some((series) => series.key === selectedTrendKey)
    ? selectedTrendKey
    : "ALL";
  const selectedTrendSeries =
    result?.trendSeries.find((series) => series.key === resolvedTrendKey) ?? allTrendSeries;
  const trendData = useMemo(
    () => selectedTrendSeries?.monthly.map(({ month, eventCount }) => ({ month, count: eventCount })) ?? [],
    [selectedTrendSeries],
  );
  useEffect(() => {
    if (
      result !== null &&
      !result.trendSeries.some((series) => series.key === selectedTrendKey)
    ) {
      setSelectedTrendKey("ALL");
    }
  }, [result, selectedTrendKey]);

  if (state.status === "ERROR") {
    return state.resolved ? <EventsAnalyticsPlaceholder /> : <AsyncQueryFeedback status="ERROR" />;
  }
  if (result === null) return <EventsAnalyticsPlaceholder loading />;
  if (result.availability === "UNAVAILABLE") {
    return <EventsAnalyticsPlaceholder message="数据不可用" />;
  }
  if (allTrendSeries === undefined) return <EventsAnalyticsPlaceholder />;
  if (selectedTrendSeries === undefined) return <EventsAnalyticsPlaceholder />;

  return (
    <section aria-label="Events Analytics" aria-busy={state.status === "LOADING" || undefined} className="relative space-y-3">
      <AnalyticsRefreshIndicator refreshing={state.status === "LOADING" && state.resolved !== null} />
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="h-full md:col-span-1 xl:col-span-3"><EventTypeDonut result={result} /></div>
        <div className="h-full md:col-span-1 xl:col-span-3">
          <AnalyticsClosureRadial
            title="关闭情况"
            numeratorCount={result.closure.closedCount}
            otherCount={result.closure.openCount}
            rate={result.closure.closureRate}
            rateLabel="关闭率"
            numeratorLabel="已关闭"
            otherLabel="未关闭"
          />
        </div>
        <div className="h-full md:col-span-2 xl:col-span-6">
          <AnalyticsCountTrend
            title="事件趋势"
            data={trendData}
            valueLabel="事件数量"
            toolbar={(
              <div className="flex items-center gap-2">
                {result.availability === "INCOMPLETE" ? <DataAvailabilityDisplay availability="INCOMPLETE" /> : null}
                <FilterSelect
                  value={resolvedTrendKey}
                  options={result.trendSeries.map((series) => ({ value: series.key, label: series.label }))}
                  onValueChange={setSelectedTrendKey}
                  ariaLabel="事件趋势类型筛选"
                />
              </div>
            )}
          />
        </div>
      </div>
    </section>
  );
}
