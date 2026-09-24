"use client";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { PageContainer } from "@/components/shared/page-container";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import type { EhsFilterContext } from "@/data/contracts/kpi";
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

function periodLabel(context: EhsFilterContext): string {
  const months = context.period.includedMonths;
  return months.length === 1
    ? months[0]
    : `${months[0]} 至 ${months[months.length - 1]}`;
}

function MetricValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-2xl font-semibold tabular-nums">{children}</span>
  );
}

function GoalMetricCard({
  title,
  description,
  help,
  children,
}: {
  title: string;
  description: string;
  help?: { description: string; target: string };
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 py-5 shadow-none">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">
          {help ? (
            <HoverCard openDelay={250} closeDelay={150}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>{title}</span>
                  <Info
                    aria-hidden="true"
                    className="size-3 text-muted-foreground"
                  />
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" align="start">
                <div className="space-y-1.5">
                  <p>{help.description}</p>
                  <p className="text-muted-foreground">{help.target}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ) : (
            title
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}

export function SummaryCards({
  summary,
  context,
}: {
  summary: TakeChargeGoalsSummary;
  context: EhsFilterContext;
}) {
  const selectedPeriod = periodLabel(context);
  const periodUnavailable =
    summary.period.availability === "INCOMPLETE" ||
    summary.period.availability === "UNAVAILABLE";
  const annualUnavailable =
    summary.annual.availability === "INCOMPLETE" ||
    summary.annual.availability === "UNAVAILABLE";

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:min-[1152px]:grid-cols-4">
      <GoalMetricCard
        title="提交总数"
        description={selectedPeriod}
        help={{
          description: "当前筛选时间范围内的 Take Charge 提交总量。",
          target: "当前不设达标阈值，仅用于展示提交活动量。",
        }}
      >
        {periodUnavailable ? (
          <DataAvailabilityDisplay availability={summary.period.availability} />
        ) : (
          <MetricValue>{summary.period.submissionTotal ?? 0}</MetricValue>
        )}
      </GoalMetricCard>
      <GoalMetricCard
        title="关闭率"
        description={selectedPeriod}
        help={{
          description: "已进入终态的 Take Charge 数量占全部 Take Charge 的比例。",
          target: "目标：≥ 90%",
        }}
      >
        {periodUnavailable ? (
          <DataAvailabilityDisplay availability={summary.period.availability} />
        ) : (
          <MetricValue>
            {summary.period.closeRate.value === null
              ? "无"
              : `${Math.round(summary.period.closeRate.value)}%`}
          </MetricValue>
        )}
      </GoalMetricCard>
      <GoalMetricCard
        title="今年平均提交数"
        description={`${summary.annual.currentYear} 年`}
        help={{
          description: "本年度截至当前统计周期的平均 Take Charge 提交数量。",
          target: "目标：≥ 4",
        }}
      >
        {annualUnavailable ? (
          <DataAvailabilityDisplay availability={summary.annual.availability} />
        ) : (
          <MetricValue>
            {summary.annual.averageSubmissionsYtd.value?.toFixed(1) ?? "无"}
          </MetricValue>
        )}
      </GoalMetricCard>
      <GoalMetricCard
        title="今年参与率"
        description={`${summary.annual.currentYear} 年`}
        help={{
          description: "本年度截至当前统计周期的 Take Charge 参与率。",
          target: "目标：≥ 50%",
        }}
      >
        {annualUnavailable ? (
          <DataAvailabilityDisplay availability={summary.annual.availability} />
        ) : (
          <MetricValue>
            {summary.annual.participationRateYtd.value === null
              ? "无"
              : `${Math.round(summary.annual.participationRateYtd.value)}%`}
          </MetricValue>
        )}
      </GoalMetricCard>
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
  const selectedPeriod = periodLabel(context);
  const currentYear = context.period.includedMonths[0]?.slice(0, 4) ?? "—";
  const cards = [
    ["提交总数", selectedPeriod],
    ["关闭率", selectedPeriod],
    ["今年平均提交数", `${currentYear} 年`],
    ["今年参与率", `${currentYear} 年`],
  ] as const;

  return (
    <div
      className={hidden ? "invisible" : undefined}
      aria-hidden="true"
    >
      <div className="grid gap-3 sm:grid-cols-2 md:min-[1152px]:grid-cols-4">
        {cards.map(([title, description]) => (
          <GoalMetricCard key={title} title={title} description={description}>
            <div className="flex h-8 items-center">
              <Skeleton className="h-7 w-16" />
            </div>
          </GoalMetricCard>
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
  const summary = state.status === "SUCCESS" ? state.data : null;

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
          {summary === null ? (
            <SummaryCardsPlaceholder
              context={filterContext}
              hidden={state.status === "ERROR"}
            />
          ) : (
            <SummaryCards summary={summary} context={filterContext} />
          )}
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
