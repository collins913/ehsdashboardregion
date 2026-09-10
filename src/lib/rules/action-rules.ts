import type { ActionRecord } from "@/types/ehs";

export type ActionOpenClassification = "open" | "closed" | "unknown";

export function classifyActionOpen(
  action: ActionRecord,
): ActionOpenClassification {
  if (action.Status === "Assigned" || action.Status === "InProgress") {
    return "open";
  }

  if (action.Status === "Closed" || action.Status === "Cancelled") {
    return "closed";
  }

  return "unknown";
}
