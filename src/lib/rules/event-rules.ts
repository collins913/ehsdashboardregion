import type { EventRecord } from "@/types/ehs";
import type { OccurrenceResult, RecordState } from "./result-types";

export type AstmEventInput = Pick<EventRecord, "ASTMInjuryIllness">;

export function classifyEventRecordState(status: string): RecordState {
  return status === "Closed" ? "CLOSED" : "OPEN";
}

export function isAstmIncident(event: AstmEventInput): boolean {
  return event.ASTMInjuryIllness === "Yes";
}

export function evaluateAstmOccurrence(
  events: readonly AstmEventInput[],
): OccurrenceResult {
  return events.some(isAstmIncident) ? "OCCURRED" : "NOT_OCCURRED";
}

export function isEventOpen(event: EventRecord): boolean {
  return classifyEventRecordState(event.Status) === "OPEN";
}
