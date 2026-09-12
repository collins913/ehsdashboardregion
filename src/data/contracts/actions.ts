import type { DataSet, KpiFilterContext } from "@/data/contracts/kpi";
import type { RecordState } from "@/lib/rules/result-types";
import type {
  IsoDate,
  ParsedActionStatus,
  SourceReference,
  StoreId,
} from "@/types/ehs";

export type ActionsViewMode = "OPEN_ONLY" | "ALL";

export interface ActionsQuery {
  context: KpiFilterContext;
  viewMode: ActionsViewMode;
}

export interface NormalizedActionRecord {
  storeId: StoreId;
  storeDisplayName: string;
  actionId: string;
  problem: string;
  action: string;
  submittedBy: string;
  owner: string;
  submittedDate: IsoDate;
  dueDate: IsoDate;
  closedDate: IsoDate | null;
  sourceStatus: ParsedActionStatus;
  recordState: RecordState;
  sourceReference?: SourceReference | null;
}

export type ActionsQueryResult = DataSet<NormalizedActionRecord>;
