"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, usePlotArea } from "recharts";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator";
import { useAnalyticsChartAnimationEnabled } from "@/components/shared/use-analytics-motion";
import { ANALYTICS_CHART_ANIMATION_DURATION, ANALYTICS_CARD_HEIGHT_CLASS_NAME } from "@/components/shared/analytics-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CertificateOverviewGroup, CertificateOverviewItem, CertificateOverviewResult } from "@/data/contracts/certificates";
import type { DataAvailability } from "@/data/contracts/kpi";

const chartConfig = {
  requiredCount: { label: "应持有数量", color: "var(--chart-certificate-required)" },
  actualCount: { label: "实际数量", color: "var(--chart-certificate-actual)" },
} satisfies ChartConfig;

function CertificateOverviewCardFrame({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <Card className={`${ANALYTICS_CARD_HEIGHT_CLASS_NAME} flex flex-col gap-0 pt-0 pb-4`}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <CardTitle>证件配置概览</CardTitle>
          {status}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-label="图表图例">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: "var(--chart-certificate-required)" }} />
            应持有
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: "var(--chart-certificate-actual)" }} />
            实际
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pt-0 pb-0">{children}</CardContent>
    </Card>
  );
}

export function CertificateOverviewPlaceholder({ loading = false }: { loading?: boolean }) {
  return (
    <section className="space-y-3" aria-label="证件配置概览" aria-busy={loading || undefined}>
      <CertificateOverviewCardFrame>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {loading ? <Skeleton className="h-40 w-full" /> : <p className="text-sm text-muted-foreground">数据查询失败，请稍后重试。</p>}
        </div>
      </CertificateOverviewCardFrame>
    </section>
  );
}

function CertificateCategoryLabels({ groups, itemCount }: {
  groups: readonly CertificateOverviewGroup[];
  itemCount: number;
}) {
  const plotArea = usePlotArea();
  if (!plotArea || itemCount === 0) return null;

  return (
    <g aria-hidden="true" className="fill-muted-foreground">
      {groups.map((group) => {
        const centerIndex = group.startIndex + group.itemCount / 2;
        const x = plotArea.x + (centerIndex / itemCount) * plotArea.width;
        return (
          <text key={group.certificateCategory} x={x} y={plotArea.y + plotArea.height + 43} textAnchor="middle" className="text-[11px]">
            {group.label}
          </text>
        );
      })}
    </g>
  );
}

export function CertificateOverview({
  availability,
  overview,
  refreshing = false,
}: {
  availability: DataAvailability;
  overview: CertificateOverviewResult;
  refreshing?: boolean;
}) {
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled();
  return (
    <section className="relative space-y-3" aria-label="证件配置概览" aria-busy={refreshing || undefined}>
      <AnalyticsRefreshIndicator refreshing={refreshing} />
      <CertificateOverviewCardFrame status={availability === "INCOMPLETE" ? <DataAvailabilityDisplay availability="INCOMPLETE" /> : null}>
        {availability === "UNAVAILABLE" ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <DataAvailabilityDisplay availability="UNAVAILABLE" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-x-auto">
            <ChartContainer config={chartConfig} className="h-full min-w-[40rem] w-full">
              <BarChart
                accessibilityLayer
                data={overview.items}
                margin={{ top: 4, right: 12, bottom: 0, left: 12 }}
                barGap={4}
                barCategoryGap="24%"
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  interval={0}
                  height={56}
                />
                <ChartTooltip
                  cursor={false}
                  content={(
                    <ChartTooltipContent
                      indicator="dashed"
                      labelFormatter={(_label, payload) => {
                        const row = payload?.[0]?.payload as CertificateOverviewItem | undefined;
                        return row ? (
                          <div className="space-y-0.5">
                            <div className="text-muted-foreground">{row.categoryLabel}</div>
                            <div className="max-w-sm whitespace-normal">{row.fullLabel}</div>
                          </div>
                        ) : null;
                      }}
                      formatter={(value, _name, item) => (
                        <>
                          <span>{item.dataKey === "requiredCount" ? "应持有数量" : "实际数量"}</span>
                          <span className="ml-auto pl-4 font-mono text-foreground">
                            {item.dataKey === "requiredCount" && value == null ? "未设置" : Number(value).toLocaleString()}
                          </span>
                        </>
                      )}
                    />
                  )}
                />
                <Bar dataKey="requiredCount" fill="var(--color-requiredCount)" radius={4} maxBarSize={30} isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
                <Bar dataKey="actualCount" fill="var(--color-actualCount)" radius={4} maxBarSize={30} isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
                <CertificateCategoryLabels groups={overview.groups} itemCount={overview.items.length} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
        {availability !== "UNAVAILABLE" ? (
          <div className="sr-only">
            {overview.groups.map((group) => <span key={group.certificateCategory}>{group.label}；</span>)}
            {overview.items.map((item) => <span key={item.certificateType}>{item.shortLabel}：{item.fullLabel}；</span>)}
          </div>
        ) : null}
      </CertificateOverviewCardFrame>
    </section>
  );
}
