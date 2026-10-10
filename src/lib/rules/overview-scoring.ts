import type { ScoreContribution, ScoreContributionReason, OverviewMetricId, OverviewDimensionId } from "@/data/contracts/overview";
import type { Month, StoreId } from "@/types/ehs";
import type { PerformanceResult, OccurrenceResult } from "./result-types";
import type { KpiStore } from "@/data/contracts/kpi";

export const OVERVIEW_V1_SCORE_RULE_VERSION = "V1" as const;

export const OVERVIEW_V1_METRIC_CATALOG = [
  { metricId: "TRAINING", dimensionId: "PERFORMANCE" },
  { metricId: "DRILL", dimensionId: "PERFORMANCE" },
  { metricId: "ACTION_CLOSURE_RATE", dimensionId: "PERFORMANCE" },
  { metricId: "INSPECTION", dimensionId: "PERFORMANCE" },
  { metricId: "ASTM_INCIDENT", dimensionId: "PERFORMANCE" },
  { metricId: "TAKE_CHARGE_CLOSE_RATE", dimensionId: "TAKE_CHARGE" },
  { metricId: "SUBMISSIONS_PER_CAPITA_YTD", dimensionId: "TAKE_CHARGE" },
  { metricId: "PARTICIPATION_RATE_YTD", dimensionId: "TAKE_CHARGE" },
  { metricId: "CERTIFICATE_SAFETY_HEALTH", dimensionId: "CERTIFICATES" },
  { metricId: "CERTIFICATE_FIRST_AID", dimensionId: "CERTIFICATES" },
  { metricId: "CERTIFICATE_SPECIAL_WORK", dimensionId: "CERTIFICATES" },
  { metricId: "CERTIFICATE_SAFE_DRIVING", dimensionId: "CERTIFICATES" },
] as const satisfies readonly { metricId: OverviewMetricId; dimensionId: Exclude<OverviewDimensionId, "ENVIRONMENT"> }[];

export interface ContributionIdentity {
  metricId: OverviewMetricId;
  dimensionId: Exclude<OverviewDimensionId, "ENVIRONMENT"> | "ENVIRONMENT";
  storeId: StoreId;
  month: Month;
  referenceDate: string;
}

export type OverviewDomainObservation =
  | { kind: "PERFORMANCE_RESULT"; result: PerformanceResult; undeterminedReason?: ScoreContributionReason }
  | { kind: "DOMAIN_ACHIEVEMENT"; result: PerformanceResult; reason: ScoreContributionReason }
  | { kind: "ASTM_RESULT"; result: OccurrenceResult | null; unavailableReason?: ScoreContributionReason }
  | { kind: "CERTIFICATE_RESULT"; normal: boolean; reason?: ScoreContributionReason }
  | { kind: "SOURCE_MISSING" }
  | { kind: "SOURCE_INVALID" }
  | { kind: "SOURCE_INCOMPLETE" }
  | { kind: "RULE_CONFIGURATION_MISSING" };

export type OverviewObservationMap = ReadonlyMap<string, OverviewDomainObservation>;

export function overviewObservationKey(storeId: StoreId, month: Month, metricId: OverviewMetricId): string {
  return `${storeId}\u0000${month}\u0000${metricId}`;
}

export function buildOverviewScoreContributions(
  stores: readonly KpiStore[],
  months: readonly Month[],
  referenceDateForMonth: (month: Month) => string,
  observations: OverviewObservationMap,
): readonly ScoreContribution[] {
  const contributions: ScoreContribution[] = [];
  const referenceDates = new Map(months.map((month) => [month, referenceDateForMonth(month)]));
  for (const store of stores) {
    for (const month of months) {
      for (const metric of OVERVIEW_V1_METRIC_CATALOG) {
        const identity = {
          ...metric,
          storeId: store.storeId,
          month,
          referenceDate: referenceDates.get(month)!,
        };
        const observation = observations.get(overviewObservationKey(store.storeId, month, metric.metricId));
        if (!observation) {
          contributions.push(missingSourceContribution(identity));
        } else if (observation.kind === "PERFORMANCE_RESULT") {
          contributions.push(contributionFromPerformanceResult(identity, observation.result, observation.undeterminedReason));
        } else if (observation.kind === "DOMAIN_ACHIEVEMENT") {
          contributions.push(createScoreContribution(identity, observation.result === "ACHIEVED", observation.reason));
        } else if (observation.kind === "ASTM_RESULT") {
          contributions.push(contributionFromAstmOccurrence(identity, observation.result, observation.unavailableReason));
        } else if (observation.kind === "CERTIFICATE_RESULT") {
          contributions.push(createScoreContribution(identity, observation.normal, observation.normal ? "ACHIEVED" : observation.reason ?? "RULE_NOT_MET"));
        } else if (observation.kind === "SOURCE_MISSING") {
          contributions.push(missingSourceContribution(identity));
        } else if (observation.kind === "SOURCE_INVALID") {
          contributions.push(invalidSourceContribution(identity));
        } else if (observation.kind === "SOURCE_INCOMPLETE") {
          contributions.push(incompleteSourceContribution(identity));
        } else {
          contributions.push(missingRuleConfigurationContribution(identity));
        }
      }
    }
  }
  return contributions;
}

export function createScoreContribution(
  identity: ContributionIdentity,
  achieved: boolean,
  reason: ScoreContributionReason = achieved ? "ACHIEVED" : "RULE_NOT_MET",
): ScoreContribution {
  return {
    ...identity,
    earnedPoints: achieved ? 1 : 0,
    availablePoints: 1,
    outcome: achieved ? "ACHIEVED" : "NOT_ACHIEVED",
    reason,
  };
}

export function contributionFromPerformanceResult(
  identity: ContributionIdentity,
  result: PerformanceResult,
  failureReason: ScoreContributionReason = "RULE_NOT_MET",
): ScoreContribution {
  if (result === "ACHIEVED") return createScoreContribution(identity, true);
  return createScoreContribution(identity, false, result === "UNDETERMINED" ? failureReason : "RULE_NOT_MET");
}

export function contributionFromAstmOccurrence(
  identity: ContributionIdentity,
  result: OccurrenceResult | null,
  unavailableReason: ScoreContributionReason = "SOURCE_INCOMPLETE",
): ScoreContribution {
  if (result === null) return createScoreContribution(identity, false, unavailableReason);
  return createScoreContribution(identity, result === "NOT_OCCURRED", result === "NOT_OCCURRED" ? "ACHIEVED" : "RULE_NOT_MET");
}

export function missingSourceContribution(identity: ContributionIdentity): ScoreContribution {
  return createScoreContribution(identity, false, "SOURCE_MISSING");
}

export function invalidSourceContribution(identity: ContributionIdentity): ScoreContribution {
  return createScoreContribution(identity, false, "SOURCE_INVALID");
}

export function incompleteSourceContribution(identity: ContributionIdentity): ScoreContribution {
  return createScoreContribution(identity, false, "SOURCE_INCOMPLETE");
}

export function missingRuleConfigurationContribution(identity: ContributionIdentity): ScoreContribution {
  return createScoreContribution(identity, false, "RULE_CONFIGURATION_MISSING");
}

export function scoreRateFromPoints(earnedPoints: number, availablePoints: number): number | null {
  if (!Number.isFinite(earnedPoints) || !Number.isFinite(availablePoints) || earnedPoints < 0 || availablePoints <= 0) return null;
  return earnedPoints / availablePoints;
}
