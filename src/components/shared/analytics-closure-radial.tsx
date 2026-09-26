"use client";

import { RadialBar, RadialBarChart } from "recharts";
import { useMemo } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { useAnalyticsChartAnimationEnabled } from "@/components/shared/use-analytics-motion";
import { ANALYTICS_CHART_ANIMATION_DURATION } from "@/components/shared/analytics-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANALYTICS_CARD_HEIGHT_CLASS_NAME } from "@/components/shared/analytics-layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const colors = {
  numeratorCount: { label: "分子", color: "var(--analytics-primary)" },
  otherCount: { label: "其他", color: "var(--analytics-secondary)" },
} satisfies ChartConfig;

export function AnalyticsClosureRadial({
  title,
  numeratorCount,
  otherCount,
  rate,
  rateLabel,
  numeratorLabel,
  otherLabel,
}: {
  title: string;
  numeratorCount: number;
  otherCount: number;
  rate: number | null;
  rateLabel: string;
  numeratorLabel: string;
  otherLabel: string;
}) {
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();
  const config = {
    numeratorCount: { ...colors.numeratorCount, label: numeratorLabel },
    otherCount: { ...colors.otherCount, label: otherLabel },
  } satisfies ChartConfig;
  const chartData = useMemo(() => [{ numeratorCount, otherCount }], [numeratorCount, otherCount]);

  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-3 py-4`}>
      <CardHeader className="items-center px-4 pb-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center px-4">
        <div className="relative mx-auto h-28 w-56">
          <ChartContainer config={config} className="absolute inset-0">
            <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={110} cy="100%">
              <RadialBar dataKey="numeratorCount" fill="var(--color-numeratorCount)" stackId="a" cornerRadius={5} className="stroke-transparent stroke-2" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
              <RadialBar dataKey="otherCount" fill="var(--color-otherCount)" stackId="a" cornerRadius={5} className="stroke-transparent stroke-2" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            </RadialBarChart>
          </ChartContainer>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center text-center"
            role="img"
            aria-label={`${rate === null ? "—" : `${Math.round(rate)}%`} ${rateLabel}`}
          >
            <span className="text-2xl font-bold leading-8 text-foreground analytics-number-transition" style={{ opacity: rate === null ? 0.65 : 1 }}>
              <AnimatedNumber value={rate} formatter={(value) => `${Math.round(value)}%`} />
            </span>
            <span className="text-xs leading-5 text-muted-foreground">{rateLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
