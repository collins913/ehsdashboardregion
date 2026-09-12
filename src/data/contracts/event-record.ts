import type { RecordState } from "@/lib/rules/result-types";
import type {
  EventType,
  IsoDate,
  SourceReference,
  StoreId,
} from "@/types/ehs";

export interface NormalizedEventRecord {
  storeId: StoreId;
  storeDisplayName: string;
  eventId: string;
  eventType: EventType;
  submittedBy: string;
  eventDate: IsoDate;
  description: string;
  sourceStatus: string;
  recordState: RecordState;
  astmInjuryIllness: string;
  sourceReference?: SourceReference | null;
}
