import type { AchievementResult, DomainReason } from "@/data/contracts/domain-result";

// Keep a concrete source defect ahead of generic coverage or threshold failures.
const specificity: Record<DomainReason, number> = {
  ACHIEVED: 0, RULE_NOT_MET: 1, NOT_APPLICABLE: 2,
  RULE_CONFIGURATION_MISSING: 3, SOURCE_INCOMPLETE: 4,
  SOURCE_MISSING: 5, SOURCE_INVALID: 6,
};
export function mostSpecificReason(reasons: readonly (DomainReason | undefined)[]): DomainReason {
  return reasons.reduce<DomainReason>((selected, reason) =>
    reason && specificity[reason] > specificity[selected] ? reason : selected, "ACHIEVED");
}
export function combineAchievementResults(results: readonly AchievementResult[]): AchievementResult {
  const reason = mostSpecificReason(results.map((result) => result.reason));
  return {
    result: results.some((result) => result.result === "UNDETERMINED") ? "UNDETERMINED"
      : results.every((result) => result.result === "ACHIEVED") ? "ACHIEVED" : "NOT_ACHIEVED",
    reason,
  };
}
