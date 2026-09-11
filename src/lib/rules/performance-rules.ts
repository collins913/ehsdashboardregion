import type { PerformanceResult } from "./result-types";

type CompletionState = boolean;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function evaluateTrainingPerformance(
  requiredTrainingCompletion: readonly CompletionState[] | null,
): PerformanceResult {
  if (requiredTrainingCompletion === null) {
    return "UNDETERMINED";
  }

  return requiredTrainingCompletion.every(Boolean)
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}

export interface DrillMonthInput {
  drillCompletion: readonly CompletionState[];
}

export function evaluateDrillPerformance(
  includedMonths: readonly DrillMonthInput[] | null,
): PerformanceResult {
  if (includedMonths === null || includedMonths.length === 0) {
    return "UNDETERMINED";
  }

  return includedMonths.every(
    ({ drillCompletion }) =>
      drillCompletion.length > 0 && drillCompletion.every(Boolean),
  )
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}

export function evaluateActionClosureRate(
  value: number | null | undefined,
  target: number | null | undefined,
): PerformanceResult {
  if (
    !isFiniteNumber(value) ||
    !isFiniteNumber(target) ||
    value < 0 ||
    value > 100 ||
    target < 0 ||
    target > 100
  ) {
    return "UNDETERMINED";
  }

  return value >= target ? "ACHIEVED" : "NOT_ACHIEVED";
}

export interface InspectionMonthInput {
  requiredInspectionCompletion: readonly CompletionState[];
}

export function evaluateInspectionPerformance(
  includedMonths: readonly InspectionMonthInput[] | null,
): PerformanceResult {
  if (
    includedMonths === null ||
    includedMonths.length === 0
  ) {
    return "UNDETERMINED";
  }

  return includedMonths.every(
    ({ requiredInspectionCompletion }) =>
      requiredInspectionCompletion.length > 0 &&
      requiredInspectionCompletion.every(Boolean),
  )
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}
