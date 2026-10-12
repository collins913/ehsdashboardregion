"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
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
  closedValue: { label: "已关闭或取消", color: "var(--chart-2)" },
  otherValue: { label: "其余行动项", color: "var(--chart-1)" },
} satisfies ChartConfig;
export const CLOSURE_RATE_DOMAIN = [0, 100] as const;
export const CLOSURE_RADIAL_START_ANGLE = 180;
export const CLOSURE_RADIAL_END_ANGLE = 0;

export function closureRateArcValue(rate: number | null): number {
  if (rate === null || !Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

export function closureArcSweepDegrees(rate: number | null): number {
  return (CLOSURE_RADIAL_START_ANGLE - CLOSURE_RADIAL_END_ANGLE) * closureRateArcValue(rate) / CLOSURE_RATE_DOMAIN[1];
}

export function closureRadialSegments(rate: number | null): { closedValue: number; otherValue: number } {
  const closedValue = closureRateArcValue(rate);
  return { closedValue, otherValue: CLOSURE_RATE_DOMAIN[1] - closedValue };
}

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
    closedValue: { ...colors.closedValue, label: numeratorLabel },
    otherValue: { ...colors.otherValue, label: otherLabel },
  } satisfies ChartConfig;
  const chartData = useMemo(() => [{ ...closureRadialSegments(rate), numeratorCount, otherCount }], [rate, numeratorCount, otherCount]);

  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-3 py-4`}>
      <CardHeader className="items-center px-4 pb-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center px-4">
        <div className="relative mx-auto aspect-[16/9] w-64 max-w-full">
          <ChartContainer config={config} className="absolute inset-0 aspect-auto">
            <RadialBarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} startAngle={CLOSURE_RADIAL_START_ANGLE} endAngle={CLOSURE_RADIAL_END_ANGLE} innerRadius="128%" outerRadius="172%" cy="100%">
              <PolarAngleAxis type="number" dataKey="closedValue" domain={CLOSURE_RATE_DOMAIN} tick={false} axisLine={false} tickLine={false} />
              <RadialBar dataKey="closedValue" stackId="a" fill="var(--color-closedValue)" cornerRadius={5} className="stroke-transparent stroke-2" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
              <RadialBar dataKey="otherValue" stackId="a" fill="var(--color-otherValue)" cornerRadius={5} className="stroke-transparent stroke-2" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name, item) => <div className="grid flex-1 gap-1"><span className="flex justify-between gap-3"><span>{name}</span><span className="font-mono tabular-nums">{rate === null ? "—" : `${Math.round(Number(value))}%`}</span></span><span className="flex justify-between gap-3"><span>{numeratorLabel}</span><span className="font-mono tabular-nums">{item.payload.numeratorCount}</span></span><span className="flex justify-between gap-3"><span>{otherLabel}</span><span className="font-mono tabular-nums">{item.payload.otherCount}</span></span></div>} />} />
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
