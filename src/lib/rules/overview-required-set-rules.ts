import type { ScoreContributionReason } from "@/data/contracts/overview";
import type { DataAvailability, KpiInspectionRecord, KpiTrainingRecord } from "@/data/contracts/kpi";
import { sourceStatusCompletion } from "@/lib/rules/performance-rules";
import type { PerformanceResult } from "@/lib/rules/result-types";

export interface RequiredSetEvaluation {
  result: PerformanceResult;
  reason: ScoreContributionReason;
}

function availabilityFailure(availability: DataAvailability): RequiredSetEvaluation | null {
  if (availability === "UNAVAILABLE") return { result: "UNDETERMINED", reason: "SOURCE_MISSING" };
  if (availability === "INCOMPLETE") return { result: "UNDETERMINED", reason: "SOURCE_INCOMPLETE" };
  return null;
}

function validRequiredSet(requiredItems: readonly string[] | null): requiredItems is readonly string[] {
  return requiredItems !== null && requiredItems.length > 0 && requiredItems.every((item) => typeof item === "string" && item.trim().length > 0) && new Set(requiredItems).size === requiredItems.length;
}

export function evaluateRequiredTraining(
  requiredItems: readonly string[] | null,
  records: readonly KpiTrainingRecord[],
  availability: DataAvailability,
): RequiredSetEvaluation {
  const sourceFailure = availabilityFailure(availability);
  if (sourceFailure) return sourceFailure;
  if (!validRequiredSet(requiredItems)) return { result: "UNDETERMINED", reason: "RULE_CONFIGURATION_MISSING" };

  for (const item of requiredItems) {
    const matching = records.filter((record) => record.trainingName === item);
    if (matching.length === 0) return { result: "UNDETERMINED", reason: "SOURCE_MISSING" };
    if (matching.length !== 1) return { result: "UNDETERMINED", reason: "SOURCE_INVALID" };
    const rate = matching[0].completionRate;
    if (rate === null) return { result: "UNDETERMINED", reason: "SOURCE_INCOMPLETE" };
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return { result: "UNDETERMINED", reason: "SOURCE_INVALID" };
    if (rate !== 100) return { result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" };
  }

  return { result: "ACHIEVED", reason: "ACHIEVED" };
}

export function evaluateExpectedInspections(
  expectedTasks: readonly string[] | null,
  records: readonly KpiInspectionRecord[],
  availability: DataAvailability,
): RequiredSetEvaluation {
  const sourceFailure = availabilityFailure(availability);
  if (sourceFailure) return sourceFailure;
  if (!validRequiredSet(expectedTasks)) return { result: "UNDETERMINED", reason: "RULE_CONFIGURATION_MISSING" };

  for (const task of expectedTasks) {
    const matching = records.filter((record) => record.inspectionName === task);
    if (matching.length === 0) return { result: "UNDETERMINED", reason: "SOURCE_MISSING" };
    if (matching.length !== 1) return { result: "UNDETERMINED", reason: "SOURCE_INVALID" };
    const record = matching[0];
    if (record.sourceStatusInvalid) return { result: "UNDETERMINED", reason: "SOURCE_INVALID" };
    if (record.status === null) return { result: "UNDETERMINED", reason: "SOURCE_INCOMPLETE" };
    const complete = sourceStatusCompletion(record.status);
    if (complete === null) return { result: "UNDETERMINED", reason: "SOURCE_INCOMPLETE" };
    if (!complete) return { result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" };
  }

  return { result: "ACHIEVED", reason: "ACHIEVED" };
}
