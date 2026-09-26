"use client";

import { useId, type ReactNode } from "react";
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
  const gradientId = `analytics-count-fill-${useId().replace(/:/g, "")}`;
  const config = {
    count: { label: valueLabel, color: "var(--analytics-primary)" },
  } satisfies ChartConfig;
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();

  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 py-4">
        <CardTitle>{title}</CardTitle>
        {toolbar}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pt-4">
        <div className="relative min-h-0 flex-1 w-full">
          <ChartContainer config={config} className="absolute inset-0 aspect-auto">
            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <YAxis hide width={0} domain={[0, (dataMax: number) => dataMax + Math.max(dataMax * 0.05, 0.1)]} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} interval={0} tickFormatter={(month: string) => `${Number(month.slice(5))}月`} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelFormatter={(month) => formatBusinessMonth(String(month ?? ""))} indicator="dot" />}
              />
              <Area dataKey="count" type="natural" baseValue={0} fill={`url(#${gradientId})`} stroke="var(--color-count)" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
