import type { TakeChargeRecord } from "@/types/ehs";

const CLOSED_TAKE_CHARGE_STATUSES = new Set([
  "ClosedWithAction",
  "ClosedWithoutAction",
  "Declined",
]);

export function isTakeChargeOpen(record: TakeChargeRecord): boolean {
  return !CLOSED_TAKE_CHARGE_STATUSES.has(record.Status);
}
