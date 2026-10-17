"use client";

import { Label, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
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
  closedValue: { color: "var(--chart-2)" },
  otherValue: { color: "var(--chart-1)" },
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
  rate,
  rateLabel,
  statusCounts,
}: {
  title: string;
  rate: number | null;
  rateLabel: string;
  statusCounts: readonly { label: string; count: number }[];
}) {
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();
  const chartData = useMemo(() => [closureRadialSegments(rate)], [rate]);

  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-3 py-4`}>
      <CardHeader className="items-center px-4 pb-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center px-4">
        <div className="relative mx-auto aspect-[16/9] w-64 max-w-full">
          <ChartContainer config={colors} className="absolute inset-0 aspect-auto">
            <RadialBarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} startAngle={CLOSURE_RADIAL_START_ANGLE} endAngle={CLOSURE_RADIAL_END_ANGLE} innerRadius="128%" outerRadius="172%" cy="100%">
              <PolarAngleAxis type="number" dataKey="closedValue" domain={CLOSURE_RATE_DOMAIN} tick={false} axisLine={false} tickLine={false} />
              <RadialBar dataKey="closedValue" stackId="a" fill="var(--color-closedValue)" cornerRadius={5} className="stroke-transparent stroke-2" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
              <RadialBar dataKey="otherValue" stackId="a" fill="var(--color-otherValue)" cornerRadius={5} className="stroke-transparent stroke-2" isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} textAnchor="middle" aria-label={`${rate === null ? "—" : `${Math.round(rate)}%`} ${rateLabel}`}>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 20} className="fill-foreground text-2xl font-bold" opacity={rate === null ? 0.65 : 1}>
                        <AnimatedNumber value={rate} formatter={(value) => `${Math.round(value)}%`} />
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 4} className="fill-muted-foreground text-xs">{rateLabel}</tspan>
                    </text>
                  );
                }} />
              </PolarRadiusAxis>
              <ChartTooltip cursor={false} content={({ active }) => (
                <ChartTooltipContent
                  active={active}
                  hideLabel
                  hideIndicator
                  payload={statusCounts.map(({ label, count }, index) => ({ name: label, value: count, dataKey: `status${index}`, graphicalItemId: `status${index}` }))}
                />
              )} />
            </RadialBarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
