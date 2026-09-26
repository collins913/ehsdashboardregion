"use client";

import { useCallback } from "react";
import { AnalyticsMetricCard } from "@/components/shared/analytics-metric-card";
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import type { EnvironmentAnalyticsQuery, EnvironmentAnalyticsResult } from "@/data/contracts/environment";
import type { EhsStoreScope, KpiPeriod } from "@/data/contracts/kpi";
import { formatBusinessMonth } from "@/lib/format-business-date-time";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

export type EnvironmentAnalyticsQueryAction = (input: {
  referenceDateIso: string;
  query: EnvironmentAnalyticsQuery;
}) => Promise<EnvironmentAnalyticsResult>;

function formatPeriod(months: readonly string[] | null): string {
  if (!months || months.length === 0) return "当前周期不可用";
  const first = formatBusinessMonth(months[0] ?? null);
  const last = formatBusinessMonth(months[months.length - 1] ?? null);
  return first === last ? first : `${first}–${last}`;
}

export function EnvironmentAnalytics({
  storeScope,
  period,
  referenceDateIso,
  queryEnvironmentAnalytics,
}: {
  storeScope: EhsStoreScope | null;
  period: KpiPeriod | null;
  referenceDateIso: string;
  queryEnvironmentAnalytics: EnvironmentAnalyticsQueryAction;
}) {
  const queryKey = storeScope
    ? JSON.stringify([referenceDateIso, storeScope, period])
    : null;
  const load = useCallback(
    async (): Promise<EnvironmentAnalyticsResult> => {
      if (storeScope === null) throw new Error("Environment scope is unavailable.");
      return queryEnvironmentAnalytics({ referenceDateIso, query: { context: storeScope, period } });
    },
    [period, queryEnvironmentAnalytics, referenceDateIso, storeScope],
  );
  const state = useLatestAsyncQuery(queryKey, storeScope ? load : null);
  const result = state.status === "SUCCESS" ? state.data : state.resolved?.data ?? null;
  const displayedMonths = result?.periodMonths ?? period?.includedMonths ?? null;
  const initialLoading = state.status === "LOADING" && result === null;
  const unavailable = result?.availability === "UNAVAILABLE";
  const expiringCount = unavailable ? null : result?.expiringContractCount ?? null;

  return (
    <section
      aria-label="Environment Analytics"
      aria-busy={state.status === "LOADING" || undefined}
      className="relative space-y-3"
    >
      <AnalyticsRefreshIndicator refreshing={state.status === "LOADING" && result !== null} />
      {state.status === "ERROR" ? <AsyncQueryFeedback status="ERROR" /> : null}
      {result && result.availability !== "AVAILABLE" && result.availability !== "CONFIRMED_EMPTY" ? (
        <div className="flex"><DataAvailabilityDisplay availability={result.availability} /></div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnalyticsMetricCard
          title="危险废物合同持有率"
          value={result?.hazardousWasteContractHolding.rate ?? null}
          subtitle="当前筛选范围"
          info="当前筛选范围内，至少有一份当前有效危险废物处置合同的门店占全部门店的比例。"
          formatter={(value) => `${Math.round(value)}%`}
          loading={initialLoading}
        />
        <AnalyticsMetricCard
          title="固体废物合同持有率"
          value={result?.solidWasteContractHolding.rate ?? null}
          subtitle="当前筛选范围"
          info="当前筛选范围内，至少有一份当前有效一般工业固体废物处置合同的门店占全部门店的比例。"
          formatter={(value) => `${Math.round(value)}%`}
          loading={initialLoading}
        />
        <AnalyticsMetricCard
          title="到期合同数量"
          value={expiringCount}
          subtitle={formatPeriod(displayedMonths)}
          info="截止日期位于当前筛选周期内的危险废物和一般工业固体废物合同数量。"
          loading={initialLoading}
        />
      </div>
    </section>
  );
}
