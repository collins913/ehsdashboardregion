"use client";

import { useMemo } from "react";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { PageContainer } from "@/components/shared/page-container";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import type { TakeChargeGoalsSummary } from "@/data/contracts/take-charge";
import {
  createEhsRepository,
  type EhsRepository,
} from "@/data/repositories";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { TakeChargeDataTable } from "@/features/goals/take-charge-data-table";

type GoalsRepository = Pick<
  EhsRepository,
  "getTakeChargeGoals" | "getTakeChargeRecords"
>;

export function loadGoalsPageData(
  context: KpiFilterContext | null,
  repository: Pick<EhsRepository, "getTakeChargeGoals">,
): TakeChargeGoalsSummary | null {
  return context === null ? null : repository.getTakeChargeGoals({ context });
}

function periodLabel(context: KpiFilterContext): string {
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
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 py-5 shadow-none">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">{title}</CardTitle>
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
  context: KpiFilterContext;
}) {
  const selectedPeriod = periodLabel(context);
  const periodUnavailable =
    summary.period.availability === "INCOMPLETE" ||
    summary.period.availability === "UNAVAILABLE";
  const annualUnavailable =
    summary.annual.availability === "INCOMPLETE" ||
    summary.annual.availability === "UNAVAILABLE";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <GoalMetricCard title="提交总数" description={selectedPeriod}>
        {periodUnavailable ? (
          <DataAvailabilityDisplay availability={summary.period.availability} />
        ) : (
          <MetricValue>{summary.period.submissionTotal ?? 0}</MetricValue>
        )}
      </GoalMetricCard>
      <GoalMetricCard title="关闭率" description={selectedPeriod}>
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

export function GoalsPageContent() {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const repository = useMemo<GoalsRepository>(
    () => createEhsRepository(new Date(referenceDateIso)),
    [referenceDateIso],
  );
  const summary = useMemo(
    () => loadGoalsPageData(filterContext, repository),
    [filterContext, repository],
  );

  return (
    <PageContainer className="space-y-6">
      {filterContext === null || summary === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成 Goals 数据，请调整筛选条件。
        </div>
      ) : (
        <>
          <SummaryCards summary={summary} context={filterContext} />
          <TakeChargeDataTable
            key={JSON.stringify(filterContext)}
            context={filterContext}
            repository={repository}
          />
        </>
      )}
    </PageContainer>
  );
}
