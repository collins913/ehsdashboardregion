"use client";

import { useCallback } from "react";
import { AnalyticsMetricCard } from "@/components/shared/analytics-metric-card";
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { PageContainer } from "@/components/shared/page-container";
import type { EhsFilterContext, KpiPeriod } from "@/data/contracts/kpi";
import type { TakeChargeGoalsSummary } from "@/data/contracts/take-charge";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { TakeChargeDataTable } from "@/features/goals/take-charge-data-table";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

export type GoalsSummaryQuery = (input: {
  referenceDateIso: string;
  query: EhsFilterContext;
}) => Promise<TakeChargeGoalsSummary>;

export async function loadGoalsPageData(
  context: EhsFilterContext | null,
  referenceDateIso: string,
  query: GoalsSummaryQuery,
): Promise<TakeChargeGoalsSummary | null> {
  return context === null
    ? null
    : query({ referenceDateIso, query: context });
}

function periodLabel(period: KpiPeriod): string {
  const months = period.includedMonths;
  return months.length === 1
    ? months[0]
    : `${months[0]} 至 ${months[months.length - 1]}`;
}

export function SummaryCards({
  summary,
}: {
  summary: TakeChargeGoalsSummary;
}) {
  const selectedPeriod = periodLabel(summary.period.period);
  const periodUnavailable =
    summary.period.availability === "INCOMPLETE" ||
    summary.period.availability === "UNAVAILABLE";
  const annualUnavailable =
    summary.annual.availability === "INCOMPLETE" ||
    summary.annual.availability === "UNAVAILABLE";

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:min-[1152px]:grid-cols-4">
      <AnalyticsMetricCard
        title="提交总数"
        size="compact"
        subtitle={selectedPeriod}
        value={periodUnavailable ? null : summary.period.submissionTotal ?? 0}
        valueFallback={periodUnavailable ? <DataAvailabilityDisplay availability={summary.period.availability} /> : undefined}
        info={
          <div className="space-y-1.5">
            <p>当前筛选时间范围内的 Take Charge 提交总量。</p>
            <p className="text-muted-foreground">当前不设达标阈值，仅用于展示提交活动量。</p>
          </div>
        }
      />
      <AnalyticsMetricCard
        title="关闭率"
        size="compact"
        subtitle={selectedPeriod}
        value={periodUnavailable ? null : summary.period.closeRate.value}
        emptyLabel="无"
        valueFallback={periodUnavailable ? <DataAvailabilityDisplay availability={summary.period.availability} /> : undefined}
        formatter={(value) => `${Math.round(value)}%`}
        info={
          <div className="space-y-1.5">
            <p>已进入终态的 Take Charge 数量占全部 Take Charge 的比例。</p>
            <p className="text-muted-foreground">目标：≥ 90%</p>
          </div>
        }
      />
      <AnalyticsMetricCard
        title="今年平均提交数"
        size="compact"
        subtitle={`${summary.annual.currentYear} 年`}
        value={annualUnavailable ? null : summary.annual.averageSubmissionsYtd.value}
        emptyLabel="无"
        valueFallback={annualUnavailable ? <DataAvailabilityDisplay availability={summary.annual.availability} /> : undefined}
        formatter={(value) => value.toFixed(1)}
        info={
          <div className="space-y-1.5">
            <p>本年度截至当前统计周期的平均 Take Charge 提交数量。</p>
            <p className="text-muted-foreground">目标：≥ 4</p>
          </div>
        }
      />
      <AnalyticsMetricCard
        title="今年参与率"
        size="compact"
        subtitle={`${summary.annual.currentYear} 年`}
        value={annualUnavailable ? null : summary.annual.participationRateYtd.value}
        emptyLabel="无"
        valueFallback={annualUnavailable ? <DataAvailabilityDisplay availability={summary.annual.availability} /> : undefined}
        formatter={(value) => `${Math.round(value)}%`}
        info={
          <div className="space-y-1.5">
            <p>本年度截至当前统计周期的 Take Charge 参与率。</p>
            <p className="text-muted-foreground">目标：≥ 50%</p>
          </div>
        }
      />
    </div>
  );
}

export function SummaryCardsPlaceholder({
  context,
  hidden = false,
}: {
  context: EhsFilterContext;
  hidden?: boolean;
}) {
  const selectedPeriod = periodLabel(context.period);
  const currentYear = context.period.includedMonths[0]?.slice(0, 4) ?? "—";
  const cards = [
    { title: "提交总数", subtitle: selectedPeriod },
    { title: "关闭率", subtitle: selectedPeriod },
    { title: "今年平均提交数", subtitle: `${currentYear} 年` },
    { title: "今年参与率", subtitle: `${currentYear} 年` },
  ] as const;

  return (
    <div
      className={hidden ? "invisible" : undefined}
      aria-hidden="true"
    >
      <div className="grid gap-3 sm:grid-cols-2 md:min-[1152px]:grid-cols-4">
        {cards.map(({ title, subtitle }) => (
          <AnalyticsMetricCard
            key={title}
            title={title}
            subtitle={subtitle}
            value={null}
            loading
            size="compact"
          />
        ))}
      </div>
    </div>
  );
}

export function GoalsPageContent({
  queryGoals,
  queryRecords,
}: {
  queryGoals: GoalsSummaryQuery;
  queryRecords: React.ComponentProps<typeof TakeChargeDataTable>["queryRecords"];
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const queryKey = filterContext
    ? JSON.stringify([referenceDateIso, filterContext])
    : null;
  const load = useCallback(
    () => loadGoalsPageData(filterContext, referenceDateIso, queryGoals),
    [filterContext, queryGoals, referenceDateIso],
  );
  const state = useLatestAsyncQuery(queryKey, filterContext ? load : null);
  const summary =
    state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;

  return (
    <PageContainer className="space-y-6">
      {state.status === "IDLE" ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成 Goals 数据，请调整筛选条件。
        </div>
      ) : filterContext === null ? null : (
        <>
          {state.status === "ERROR" ? (
            <AsyncQueryFeedback status="ERROR" />
          ) : null}
          <div className="relative" aria-busy={state.status === "LOADING" || undefined}>
            <AnalyticsRefreshIndicator refreshing={state.status === "LOADING" && summary !== null} />
            {summary === null ? (
              <SummaryCardsPlaceholder
                context={filterContext}
                hidden={state.status === "ERROR"}
              />
            ) : (
              <SummaryCards summary={summary} />
            )}
          </div>
          <TakeChargeDataTable
            context={filterContext}
            referenceDateIso={referenceDateIso}
            queryRecords={queryRecords}
          />
        </>
      )}
    </PageContainer>
  );
}
