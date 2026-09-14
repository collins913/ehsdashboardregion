import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import type { EventType } from "@/types/ehs";

export type { NormalizedEventRecord } from "@/data/contracts/event-record";

export type EventsViewMode = "OPEN_ONLY" | "ALL";
export type EventSortKey =
  | "store"
  | "eventId"
  | "eventType"
  | "description"
  | "eventDate"
  | "status"
  | "submittedBy";
export type EventSortDirection = "asc" | "desc";

export interface EventsQuery {
  context: EhsFilterContext;
  viewMode: EventsViewMode;
  eventType?: EventType;
  sorting?: {
    key: EventSortKey;
    direction: EventSortDirection;
  };
  pageIndex: number;
  pageSize: number;
}

export interface EventsQueryResult {
  availability: DataAvailability;
  items: readonly NormalizedEventRecord[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  availableEventTypes: readonly EventType[];
}
