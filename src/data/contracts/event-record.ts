import type { RecordState } from "@/lib/rules/result-types";
import type {
  EventType,
  SourceReference,
  StoreId,
  TimezoneAwareIsoDateTime,
} from "@/types/ehs";

export interface NormalizedEventRecord {
  storeId: StoreId;
  storeDisplayName: string;
  eventId: string;
  eventType: EventType;
  submittedBy: string;
  eventDate: TimezoneAwareIsoDateTime;
  description: string;
  sourceStatus: string;
  recordState: RecordState;
  astmInjuryIllness: string;
  sourceReference?: SourceReference | null;
}
