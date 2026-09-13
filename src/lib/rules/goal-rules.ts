import type { PerformanceResult } from "./result-types";

function evaluateThreshold(
  value: number | null | undefined,
  threshold: number,
  maximum?: number,
): PerformanceResult {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (maximum !== undefined && value > maximum)
  ) {
    return "UNDETERMINED";
  }

  return value >= threshold ? "ACHIEVED" : "NOT_ACHIEVED";
}

export function evaluateTakeChargeSubmissionsPerCapita(
  value: number | null | undefined,
): PerformanceResult {
  return evaluateThreshold(value, 4);
}

export function calculateTakeChargeCloseRate(
  closedCount: number,
  totalCount: number,
): number | null {
  if (
    !Number.isInteger(closedCount) ||
    !Number.isInteger(totalCount) ||
    closedCount < 0 ||
    totalCount < 0 ||
    closedCount > totalCount ||
    totalCount === 0
  ) {
    return null;
  }

  return (closedCount / totalCount) * 100;
}

export function evaluateTakeChargeCloseRate(
  value: number | null | undefined,
): PerformanceResult {
  return evaluateThreshold(value, 90, 100);
}

export function evaluateTakeChargeParticipateRate(
  value: number | null | undefined,
): PerformanceResult {
  return evaluateThreshold(value, 50, 100);
}
