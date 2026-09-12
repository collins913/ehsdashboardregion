import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type { DataSet, KpiFilterContext } from "@/data/contracts/kpi";
import type { EventType } from "@/types/ehs";

export type { NormalizedEventRecord } from "@/data/contracts/event-record";

export type EventsViewMode = "OPEN_ONLY" | "ALL";

export interface EventsQuery {
  context: KpiFilterContext;
  viewMode: EventsViewMode;
  eventType?: EventType;
}

export type EventsQueryResult = DataSet<NormalizedEventRecord>;
