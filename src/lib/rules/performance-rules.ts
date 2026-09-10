import type { PerformanceResult } from "./result-types";

type CompletionState = boolean;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface TrainingMonthInput {
  requiredTrainingCompletion: readonly CompletionState[] | null;
}

export function evaluateTrainingPerformance(
  includedMonths: readonly TrainingMonthInput[] | null,
): PerformanceResult {
  if (
    includedMonths === null ||
    includedMonths.length === 0 ||
    includedMonths.some(
      ({ requiredTrainingCompletion }) =>
        requiredTrainingCompletion === null ||
        requiredTrainingCompletion.length === 0,
    )
  ) {
    return "UNDETERMINED";
  }

  return includedMonths.every(({ requiredTrainingCompletion }) =>
    requiredTrainingCompletion?.every(Boolean),
  )
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}

export interface DrillMonthInput {
  completedDrillCount: number;
}

export function evaluateDrillPerformance(
  includedMonths: readonly DrillMonthInput[] | null,
): PerformanceResult {
  if (
    includedMonths === null ||
    includedMonths.length === 0 ||
    includedMonths.some(
      ({ completedDrillCount }) =>
        !Number.isInteger(completedDrillCount) || completedDrillCount < 0,
    )
  ) {
    return "UNDETERMINED";
  }

  return includedMonths.every(({ completedDrillCount }) => completedDrillCount >= 1)
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

export function evaluateInspectionPerformance(
  requiredInspectionCompletion: readonly CompletionState[] | null,
): PerformanceResult {
  if (
    requiredInspectionCompletion === null ||
    requiredInspectionCompletion.length === 0
  ) {
    return "UNDETERMINED";
  }

  return requiredInspectionCompletion.every(Boolean)
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}
