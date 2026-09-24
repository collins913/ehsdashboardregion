import type { PerformanceResult } from "./result-types";

type CompletionState = boolean;
type SourceCompletionState = boolean | null;

export function sourceStatusCompletion(status: string | null): SourceCompletionState {
  const normalizedStatus = status?.trim();
  if (!normalizedStatus) return null;
  return normalizedStatus === "已完成";
}

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
  drillCompletion: readonly SourceCompletionState[];
}

export function evaluateDrillPerformance(
  includedMonths: readonly DrillMonthInput[] | null,
): PerformanceResult {
  if (includedMonths === null || includedMonths.length === 0) {
    return "UNDETERMINED";
  }

  if (includedMonths.some(({ drillCompletion }) => drillCompletion.includes(null))) {
    return "UNDETERMINED";
  }

  return includedMonths.every(
    ({ drillCompletion }) =>
      drillCompletion.length > 0 &&
      drillCompletion.every(Boolean),
  )
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}

export const ACTION_CLOSURE_RATE_TARGET = 90;

export type ActionClosureRateInput =
  | { kind: "RATE"; value: number }
  | { kind: "CONFIRMED_NO_ACTIONS" }
  | { kind: "UNDETERMINED" };

export function evaluateActionClosureRate(
  input: ActionClosureRateInput,
): PerformanceResult {
  if (input.kind === "UNDETERMINED") {
    return "UNDETERMINED";
  }

  if (input.kind === "CONFIRMED_NO_ACTIONS") {
    return "ACHIEVED";
  }

  if (!isFiniteNumber(input.value) || input.value < 0 || input.value > 100) {
    return "UNDETERMINED";
  }

  return input.value >= ACTION_CLOSURE_RATE_TARGET
    ? "ACHIEVED"
    : "NOT_ACHIEVED";
}

export interface InspectionMonthInput {
  requiredInspectionCompletion: readonly SourceCompletionState[];
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

  if (
    includedMonths.some(({ requiredInspectionCompletion }) =>
      requiredInspectionCompletion.includes(null),
    )
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
