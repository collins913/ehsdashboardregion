import type { DataAvailability } from "@/data/contracts/kpi";
import type { DomainReason } from "@/data/contracts/domain-result";
import type { TakeChargeAnnualSource, TakeChargeMetricValue } from "@/data/contracts/take-charge";
import { calculateTakeChargeCloseRate, evaluateTakeChargeCloseRate, evaluateTakeChargeParticipateRate, evaluateTakeChargeSubmissionsPerCapita } from "./goal-rules";

function metric(source: { value: number | null; reason?: DomainReason }, evaluate: (value: number | null) => TakeChargeMetricValue["result"]): TakeChargeMetricValue {
  const result = source.reason ? "UNDETERMINED" : evaluate(source.value);
  return { value: result === "UNDETERMINED" ? null : source.value, result,
    reason: source.reason ?? (result === "UNDETERMINED" ? source.value === null ? "SOURCE_MISSING" : "SOURCE_INVALID" : result === "ACHIEVED" ? "ACHIEVED" : "RULE_NOT_MET") };
}
export function evaluateTakeChargeAnnual(source: TakeChargeAnnualSource) {
  const submissionsPerCapitaYtd = metric(source.submissionsPerCapitaYtd, evaluateTakeChargeSubmissionsPerCapita);
  const participationRateYtd = metric(source.participationRateYtd, evaluateTakeChargeParticipateRate);
  return { availability: submissionsPerCapitaYtd.result === "UNDETERMINED" || participationRateYtd.result === "UNDETERMINED" ? "INCOMPLETE" as const : "AVAILABLE" as const,
    submissionsPerCapitaYtd, participationRateYtd };
}
export function evaluateTakeChargePeriod(totalCount: number, closedCount: number, availability: DataAvailability, sourceReason?: DomainReason): TakeChargeMetricValue {
  if (sourceReason || availability === "INCOMPLETE" || availability === "UNAVAILABLE") {
    return { value: null, result: "UNDETERMINED", reason: sourceReason ?? (availability === "UNAVAILABLE" ? "SOURCE_MISSING" : "SOURCE_INCOMPLETE") };
  }
  const value = calculateTakeChargeCloseRate(closedCount, totalCount);
  if (totalCount === 0 && closedCount === 0) return { value: null, result: "UNDETERMINED", reason: "RULE_NOT_MET" };
  const result = evaluateTakeChargeCloseRate(value);
  return { value, result, reason: result === "UNDETERMINED" ? "SOURCE_INVALID" : result === "ACHIEVED" ? "ACHIEVED" : "RULE_NOT_MET" };
}
