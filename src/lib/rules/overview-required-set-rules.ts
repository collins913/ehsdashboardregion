import type { AchievementResult, DomainReason } from "@/data/contracts/domain-result";
import { mostSpecificReason } from "./domain-diagnostics";
import type { DataAvailability, KpiInspectionRecord, KpiTrainingRecord } from "@/data/contracts/kpi";
import { sourceStatusCompletion } from "@/lib/rules/performance-rules";


export type RequiredSetEvaluation = AchievementResult;

function availabilityFailure(availability: DataAvailability): RequiredSetEvaluation | null {
  if (availability === "UNAVAILABLE") return { result: "UNDETERMINED", reason: "SOURCE_MISSING" };
  if (availability === "INCOMPLETE") return { result: "UNDETERMINED", reason: "SOURCE_INCOMPLETE" };
  return null;
}

function validRequiredSet(requiredItems: readonly string[] | null): requiredItems is readonly string[] {
  return requiredItems !== null && requiredItems.length > 0 && requiredItems.every((item) => typeof item === "string" && item.trim().length > 0) && new Set(requiredItems).size === requiredItems.length;
}

function requiredSetResult(reasons: readonly DomainReason[], availability: DataAvailability): RequiredSetEvaluation {
  const reason = mostSpecificReason([...reasons, availabilityFailure(availability)?.reason]);
  return { result: reason === "ACHIEVED" ? "ACHIEVED" : reason === "RULE_NOT_MET" ? "NOT_ACHIEVED" : "UNDETERMINED", reason };
}

export function evaluateRequiredTraining(
  requiredItems: readonly string[] | null,
  records: readonly KpiTrainingRecord[],
  availability: DataAvailability,
): RequiredSetEvaluation {
  if (!validRequiredSet(requiredItems)) return { result: "UNDETERMINED", reason: "RULE_CONFIGURATION_MISSING" };
  const reasons = requiredItems.map((item): DomainReason => {
    const matching = records.filter((record) => record.trainingName === item);
    if (matching.length === 0) return "SOURCE_MISSING";
    if (matching.length !== 1) return "SOURCE_INVALID";
    const rate = matching[0].completionRate;
    if (rate === null) return "SOURCE_INCOMPLETE";
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) return "SOURCE_INVALID";
    return rate === 100 ? "ACHIEVED" : "RULE_NOT_MET";
  });
  return requiredSetResult(reasons, availability);
}

export function evaluateExpectedInspections(
  expectedTasks: readonly string[] | null,
  records: readonly KpiInspectionRecord[],
  availability: DataAvailability,
): RequiredSetEvaluation {
  if (!validRequiredSet(expectedTasks)) return { result: "UNDETERMINED", reason: "RULE_CONFIGURATION_MISSING" };
  const reasons = expectedTasks.map((task): DomainReason => {
    const matching = records.filter((record) => record.inspectionName === task);
    if (matching.length === 0) return "SOURCE_MISSING";
    if (matching.length !== 1) return "SOURCE_INVALID";
    const record = matching[0];
    if (record.sourceStatusInvalid) return "SOURCE_INVALID";
    const complete = sourceStatusCompletion(record.status);
    if (complete === null) return "SOURCE_INCOMPLETE";
    return complete ? "ACHIEVED" : "RULE_NOT_MET";
  });
  return requiredSetResult(reasons, availability);
}
