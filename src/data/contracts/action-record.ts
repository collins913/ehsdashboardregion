import type { RecordState } from "@/lib/rules/result-types";
import type {
  ParsedActionStatus,
  SourceReference,
  StoreId,
  TimezoneAwareIsoDateTime,
} from "@/types/ehs";

export interface NormalizedActionRecord {
  storeId: StoreId;
  storeDisplayName: string;
  actionId: string;
  problem: string;
  action: string;
  submittedBy: string;
  owner: string;
  submittedDate: TimezoneAwareIsoDateTime;
  dueDate: TimezoneAwareIsoDateTime;
  closedDate: TimezoneAwareIsoDateTime | null;
  sourceStatus: ParsedActionStatus;
  recordState: RecordState;
  sourceReference?: SourceReference | null;
}
