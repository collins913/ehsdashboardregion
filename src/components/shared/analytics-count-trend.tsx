"use client";

import { type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
    count: { label: valueLabel, color: "var(--analytics-primary)" },
  } satisfies ChartConfig;
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();
  const scale = analyticsCountTrendScale(data);

  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 py-4">
        <CardTitle>{title}</CardTitle>
        {toolbar}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pt-4">
        <div className="relative min-h-0 flex-1 w-full">
          <ChartContainer config={config} className="absolute inset-0 aspect-auto">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <YAxis type="number" width={34} domain={scale.domain} ticks={scale.ticks} allowDataOverflow tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} tickFormatter={(value: number) => String(Math.round(value))} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={8} tick={{ fontSize: 10 }} tickFormatter={(month: string) => `${Number(month.slice(5))}月`} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelFormatter={(month) => formatBusinessMonth(String(month ?? ""))} indicator="dot" />}
              />
              <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
