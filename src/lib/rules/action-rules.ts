import type { ActionRecord } from "@/types/ehs";
import type { RecordState } from "./result-types";

export function classifyActionRecordState(
  action: ActionRecord,
): RecordState {
  if (action.Status.kind === "UNKNOWN") {
    return "UNKNOWN";
  }

  if (
    action.Status.value === "Assigned" ||
    action.Status.value === "InProgress"
  ) {
    return "OPEN";
  }

  if (action.Status.value === "Closed") {
    return "CLOSED";
  }

  if (action.Status.value === "Cancelled") {
    return "EXCLUDED";
  }

  return "UNKNOWN";
}
