"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import type { EventsViewMode } from "@/data/contracts/events";
import type { EventsQuery, EventsQueryResult } from "@/data/contracts/events";
import {
  DEFAULT_EVENTS_VIEW_MODE,
  EventsDataTable,
} from "@/features/events/events-data-table";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import type { EventType } from "@/types/ehs";

export type EventsQueryAction = (input: {
  referenceDateIso: string;
  query: EventsQuery;
}) => Promise<EventsQueryResult>;

export function EventsPageContent({
  queryEvents,
}: {
  queryEvents: EventsQueryAction;
}) {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const [viewMode, setViewMode] =
    useState<EventsViewMode>(DEFAULT_EVENTS_VIEW_MODE);
  const [eventType, setEventType] = useState<EventType | null>(null);
  return (
    <PageContainer>
      {filterContext === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成事件数据，请调整筛选条件。
        </div>
      ) : (
        <EventsDataTable
          context={filterContext}
          referenceDateIso={referenceDateIso}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          eventType={eventType}
          onEventTypeChange={setEventType}
          queryEvents={queryEvents}
        />
      )}
    </PageContainer>
  );
}
