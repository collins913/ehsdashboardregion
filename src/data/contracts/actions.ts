import type { NormalizedActionRecord } from "@/data/contracts/action-record";
import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";

export type { NormalizedActionRecord } from "@/data/contracts/action-record";

export type ActionsViewMode = "OPEN_ONLY" | "ALL";
export type ActionSortKey =
  | "store"
  | "actionId"
  | "problem"
  | "action"
  | "dueDate"
  | "status"
  | "owner"
  | "submittedBy"
  | "submittedDate"
  | "closedDate";
export type ActionSortDirection = "asc" | "desc";

export interface ActionsQuery {
  context: EhsFilterContext;
  viewMode: ActionsViewMode;
  sorting?: {
    key: ActionSortKey;
    direction: ActionSortDirection;
  };
  pageIndex: number;
  pageSize: number;
}

export interface ActionsQueryResult {
  availability: DataAvailability;
  items: readonly NormalizedActionRecord[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}
