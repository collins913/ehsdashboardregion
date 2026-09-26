import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import type { EventType, Month } from "@/types/ehs";

export interface EventAnalyticsQuery {
  context: EhsFilterContext;
}

export interface EventTypeAnalytics {
  eventType: EventType;
  count: number;
}

export interface EventClosureAnalytics {
  closedCount: number;
  openCount: number;
  closureRate: number | null;
}

export interface EventMonthlyAnalytics {
  month: Month;
  eventCount: number;
  closureRate: number | null;
}

export interface EventTrendMonthlyAnalytics {
  month: Month;
  eventCount: number;
}

export interface EventTrendSeries {
  key: "ALL" | `EVENT_TYPE:${string}`;
  eventType: EventType | null;
  label: string;
  monthly: readonly EventTrendMonthlyAnalytics[];
}

export interface EventAnalyticsResult {
  availability: DataAvailability;
  totalCount: number;
  byType: readonly EventTypeAnalytics[];
  closure: EventClosureAnalytics;
  monthly: readonly EventMonthlyAnalytics[];
  trendSeries: readonly EventTrendSeries[];
}
