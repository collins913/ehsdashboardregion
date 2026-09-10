import type { EventRecord } from "@/types/ehs";
import type { OccurrenceResult, RecordState } from "./result-types";

export function classifyEventRecordState(status: string): RecordState {
  return status === "Closed" ? "CLOSED" : "OPEN";
}

export function isAstmIncident(event: EventRecord): boolean {
  return event.ASTMInjuryIllness === "Yes";
}

export function evaluateAstmOccurrence(
  events: readonly EventRecord[],
): OccurrenceResult {
  return events.some(isAstmIncident) ? "OCCURRED" : "NOT_OCCURRED";
}

export function isEventOpen(event: EventRecord): boolean {
  return classifyEventRecordState(event.Status) === "OPEN";
}
