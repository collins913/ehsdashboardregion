"use client";

import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import type {
  EventsQueryResult,
  EventsViewMode,
} from "@/data/contracts/events";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import {
  createEhsRepository,
  type EhsRepository,
} from "@/data/repositories";
import {
  DEFAULT_EVENTS_VIEW_MODE,
  EventsDataTable,
} from "@/features/events/events-data-table";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import type { EventType } from "@/types/ehs";

type EventsPageRepository = Pick<EhsRepository, "getEvents">;

export function loadEventsPageData(
  context: KpiFilterContext | null,
  viewMode: EventsViewMode,
  repository: EventsPageRepository,
  eventType?: EventType,
): EventsQueryResult | null {
  return context === null
    ? null
    : repository.getEvents({ context, viewMode, eventType });
}

export function eventTypeOptionsFromRecords(
  records: EventsQueryResult["items"],
): readonly EventType[] {
  return [...new Set(records.map(({ eventType }) => eventType))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function EventsPageContent() {
  const { filterContext, referenceDateIso } = useGlobalFilters();
  const [viewMode, setViewMode] =
    useState<EventsViewMode>(DEFAULT_EVENTS_VIEW_MODE);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const repository = useMemo(
    () => createEhsRepository(new Date(referenceDateIso)),
    [referenceDateIso],
  );
  const unfilteredResult = useMemo(
    () => loadEventsPageData(filterContext, viewMode, repository),
    [filterContext, repository, viewMode],
  );
  const eventTypeOptions = useMemo(
    () =>
      unfilteredResult === null
        ? []
        : eventTypeOptionsFromRecords(unfilteredResult.items),
    [unfilteredResult],
  );
  const effectiveEventType =
    eventType !== null && eventTypeOptions.includes(eventType) ? eventType : null;
  const result = useMemo(
    () =>
      effectiveEventType === null
        ? unfilteredResult
        : loadEventsPageData(
            filterContext,
            viewMode,
            repository,
            effectiveEventType,
          ),
    [effectiveEventType, filterContext, repository, unfilteredResult, viewMode],
  );

  useEffect(() => {
    if (eventType !== null && !eventTypeOptions.includes(eventType)) {
      setEventType(null);
    }
  }, [eventType, eventTypeOptions]);

  return (
    <PageContainer>
      {result === null ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          当前筛选条件尚不能生成事件数据，请调整筛选条件。
        </div>
      ) : (
        <EventsDataTable
          rows={result.items}
          availability={result.availability}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          eventType={effectiveEventType}
          eventTypeOptions={eventTypeOptions}
          onEventTypeChange={setEventType}
        />
      )}
    </PageContainer>
  );
}
