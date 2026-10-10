"use client";

import { type ReactNode, useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ANALYTICS_CARD_HEIGHT_CLASS_NAME,
} from "@/components/shared/analytics-layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBusinessMonth } from "@/lib/format-business-date-time";
import { useAnalyticsChartAnimationEnabled } from "@/components/shared/use-analytics-motion";
import { ANALYTICS_CHART_ANIMATION_DURATION } from "@/components/shared/analytics-layout";

export interface AnalyticsCountTrendRow {
  month: string;
  count: number;
}

export interface AnalyticsCountTrendScale {
  domain: readonly [number, number];
  ticks: readonly number[];
}

export function analyticsCountTrendScale(data: readonly AnalyticsCountTrendRow[]): AnalyticsCountTrendScale {
  const dataMax = data.reduce((max, row) => Number.isFinite(row.count) ? Math.max(max, row.count) : max, 0);
  const paddedMax = dataMax > 0 ? dataMax + Math.max(dataMax * 0.05, 1) : 1;
  const boundedMax = Number.isFinite(paddedMax) ? Math.ceil(paddedMax) : dataMax;
  const tickStep = Math.max(1, Math.ceil(boundedMax / 4));
  const domainMax = Math.ceil(boundedMax / tickStep) * tickStep;
  const tickCount = Math.floor(domainMax / tickStep);
  return {
    domain: [0, domainMax],
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * tickStep),
  };
}

export function AnalyticsCountTrend({
  title,
  data,
  valueLabel,
  toolbar,
}: {
  title: string;
  data: readonly AnalyticsCountTrendRow[];
  valueLabel: string;
  toolbar?: ReactNode;
}) {
  const config = {
    count: { label: valueLabel, color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();
  const scale = analyticsCountTrendScale(data);
  const gradientId = `count-gradient-${useId().replace(/:/g, "")}`;

  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 py-4">
        <CardTitle>{title}</CardTitle>
        {toolbar}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pt-4">
        <div className="relative min-h-0 flex-1 w-full">
          <ChartContainer config={config} className="absolute inset-0 aspect-auto">
            <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <YAxis hide type="number" domain={scale.domain} ticks={scale.ticks} allowDataOverflow />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(month: string) => `${Number(month.slice(5))}月`} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelFormatter={(month) => formatBusinessMonth(String(month ?? ""))} indicator="dot" />}
              />
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area dataKey="count" type="monotone" fill={`url(#${gradientId})`} fillOpacity={0.4} stroke="var(--color-count)" dot={data.length === 1 ? { r: 3 } : false} connectNulls={false} isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
