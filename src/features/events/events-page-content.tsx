"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { ANALYTICS_PAGE_CONTAINER_CLASS_NAME } from "@/components/shared/analytics-layout";
import type { EventsViewMode } from "@/data/contracts/events";
import type { EventsQuery, EventsQueryResult } from "@/data/contracts/events";
import type { EventAnalyticsQuery, EventAnalyticsResult } from "@/data/contracts/event-analytics";
import {
  DEFAULT_EVENTS_VIEW_MODE,
  EventsDataTable,
} from "@/features/events/events-data-table";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import type { EventType } from "@/types/ehs";
import { EventsAnalytics } from "@/features/events/events-analytics";

export type EventsQueryAction = (input: {
  referenceDateIso: string;
  query: EventsQuery;
}) => Promise<EventsQueryResult>;

export type EventsAnalyticsQueryAction = (input: {
  referenceDateIso: string;
  query: EventAnalyticsQuery;
}) => Promise<EventAnalyticsResult>;

export function EventsPageContent({
  queryEvents,
  queryEventsAnalytics,
}: {
  queryEvents: EventsQueryAction;
  queryEventsAnalytics: EventsAnalyticsQueryAction;
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const [viewMode, setViewMode] =
    useState<EventsViewMode>(DEFAULT_EVENTS_VIEW_MODE);
  const [eventType, setEventType] = useState<EventType | null>(null);
  return (
    <PageContainer className={ANALYTICS_PAGE_CONTAINER_CLASS_NAME}>
      {filterContext === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成事件数据，请调整筛选条件。
        </div>
      ) : (
        <div className="space-y-6">
          <EventsAnalytics
            context={filterContext}
            referenceDateIso={referenceDateIso}
            queryEventsAnalytics={queryEventsAnalytics}
          />
          <EventsDataTable
            context={filterContext}
            referenceDateIso={referenceDateIso}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            eventType={eventType}
            onEventTypeChange={setEventType}
            queryEvents={queryEvents}
          />
        </div>
      )}
    </PageContainer>
  );
}
