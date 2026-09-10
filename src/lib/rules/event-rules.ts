import type { EventRecord } from "@/types/ehs";

export function isAstmIncident(event: EventRecord): boolean {
  return event.ASTMInjuryIllness === "Yes";
}

export function isEventOpen(event: EventRecord): boolean {
  return event.Status !== "Closed";
}
