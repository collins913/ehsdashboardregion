import type { TakeChargeRecord } from "@/types/ehs";
import type { RecordState } from "./result-types";

const CLOSED_TAKE_CHARGE_STATUSES = new Set([
  "ClosedWithAction",
  "ClosedWithoutAction",
  "Declined",
]);

export function classifyTakeChargeRecordState(status: string): RecordState {
  return CLOSED_TAKE_CHARGE_STATUSES.has(status) ? "CLOSED" : "OPEN";
}

export function isTakeChargeOpen(record: TakeChargeRecord): boolean {
  return classifyTakeChargeRecordState(record.Status) === "OPEN";
}
