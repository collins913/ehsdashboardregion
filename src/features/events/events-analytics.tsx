"use client";
import { queryErrorMessage } from "@/data/contracts/query-result";
import type { QueryOutcome } from "@/data/contracts/query-result";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Label, Pie, PieChart, Text } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { useAnalyticsChartAnimationEnabled } from "@/components/shared/use-analytics-motion";
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
}) => Promise<QueryOutcome<EventAnalyticsResult>>;

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
  const typeConfig = Object.fromEntries(result.byType.map((item, index) => [
    `type${index}`,
    { label: item.eventType, color: EVENT_TYPE_COLORS[index % EVENT_TYPE_COLORS.length] },
  ])) satisfies ChartConfig;
  const typeData = result.byType.map((item, index) => ({
    ...item,
    legendKey: `type${index}`,
    fill: EVENT_TYPE_COLORS[index % EVENT_TYPE_COLORS.length],
  }));
  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-3 py-4`}>
      <CardHeader className="items-center px-4 pb-0">
        <CardTitle>类型分布</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 items-center justify-center px-4">
        <ChartContainer config={typeConfig} className="mx-auto h-full w-full max-w-xl aspect-auto">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="legendKey" />} />
            <Pie data={typeData} dataKey="count" nameKey="legendKey" innerRadius="55%" outerRadius="74%" labelLine={false} label={({ cx, cy, midAngle, outerRadius, index }) => {
              if (cx == null || cy == null || midAngle == null || outerRadius == null) return null;
              const angle = -midAngle * Math.PI / 180;
              const cosine = Math.cos(angle);
              const sine = Math.sin(angle);
              const labelX = cx + (outerRadius + 8) * cosine;
              const labelY = cy + (outerRadius + 8) * sine;
              const nearVertical = Math.abs(cosine) < 0.3;
              const textAnchor = nearVertical ? "middle" : cosine > 0 ? "start" : "end";
              const verticalAnchor = nearVertical ? sine < 0 ? "end" : "start" : "middle";
              const labelWidth = Math.max(24, nearVertical
                ? 2 * Math.min(labelX, 2 * cx - labelX) - 16
                : (cosine > 0 ? 2 * cx - labelX : labelX) - 8);
              const name = typeData[index]?.eventType ?? "";
              return (
                <g className="pointer-events-none">
                  <title>{name}</title>
                  <Text x={labelX} y={labelY} width={labelWidth} maxLines={2} textAnchor={textAnchor} verticalAnchor={verticalAnchor} className="fill-foreground text-xs">{name}</Text>
                </g>
              );
            }} strokeWidth={5} isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out">
              {typeData.map((item) => <Cell key={item.legendKey} fill={item.fill} />)}
              <Label content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle" aria-label={`${result.totalCount.toLocaleString()} 个事件`}>
                    <tspan x={viewBox.cx} className="fill-foreground text-2xl font-bold">
                      <AnimatedNumber value={result.totalCount} />
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-sm">事件数量</tspan>
                  </text>
                );
              }} />
            </Pie>
          </PieChart>
        </ChartContainer>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 lg:col-span-4`}>
        <CardHeader className="px-4 py-4"><CardTitle>类型分布</CardTitle></CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 pt-4">{loading ? <Skeleton className="size-44 rounded-full" /> : <p className="text-sm text-muted-foreground">{message}</p>}</CardContent>
      </Card>
      <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4 lg:col-span-8`}>
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
    return state.resolved ? <EventsAnalyticsPlaceholder message={queryErrorMessage(state.errorCode)} /> : <AsyncQueryFeedback status="ERROR" errorCode={state.errorCode} />;
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
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="h-full lg:col-span-4"><EventTypeDonut result={result} /></div>
        <div className="h-full lg:col-span-8">
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
                  className="w-44"
                />
              </div>
            )}
          />
        </div>
      </div>
    </section>
  );
}
