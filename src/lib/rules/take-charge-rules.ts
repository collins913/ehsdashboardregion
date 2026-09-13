import type { RecordState } from "./result-types";

const CLOSED_TAKE_CHARGE_STATUSES = new Set([
  "ClosedWithAction",
  "ClosedWithoutAction",
  "Declined",
]);

export function classifyTakeChargeRecordState(status: string): RecordState {
  const normalizedStatus = status.trim();

  if (normalizedStatus.length === 0) {
    return "UNKNOWN";
  }

  return CLOSED_TAKE_CHARGE_STATUSES.has(normalizedStatus) ? "CLOSED" : "OPEN";
}

export function isTakeChargeClosedForRate(status: string): boolean {
  return classifyTakeChargeRecordState(status) === "CLOSED";
}
