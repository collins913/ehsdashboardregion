import type { DataAvailability, EhsFilterContext, EhsStoreScope, KpiStore } from "@/data/contracts/kpi";
import type { Month, StoreId } from "@/types/ehs";

export type OverviewDimensionId = "PERFORMANCE" | "TAKE_CHARGE" | "CERTIFICATES" | "ENVIRONMENT";
export type OverviewMetricId =
  | "TRAINING"
  | "DRILL"
  | "ACTION_CLOSURE_RATE"
  | "INSPECTION"
  | "ASTM_INCIDENT"
  | "TAKE_CHARGE_CLOSE_RATE"
  | "AVERAGE_SUBMISSIONS_YTD"
  | "PARTICIPATION_RATE_YTD"
  | "CERTIFICATE_SAFETY_HEALTH"
  | "CERTIFICATE_FIRST_AID"
  | "CERTIFICATE_SPECIAL_WORK"
  | "CERTIFICATE_SAFE_DRIVING";

export type ScoreContributionOutcome = "ACHIEVED" | "NOT_ACHIEVED";
export type ScoreContributionReason = import("./domain-result").DomainReason;

export interface ScoreContribution {
  metricId: OverviewMetricId;
  dimensionId: Exclude<OverviewDimensionId, "ENVIRONMENT"> | "ENVIRONMENT";
  storeId: StoreId;
  month: Month;
  referenceDate: string;
  earnedPoints: 0 | 1;
  availablePoints: 1;
  outcome: ScoreContributionOutcome;
  reason: ScoreContributionReason;
}

export interface OverviewQuery {
  context: EhsStoreScope;
}

export interface OverviewScoreDataQuery { scope: EhsStoreScope; attentionScope?: EhsStoreScope }
export interface OverviewScoreData {
  stores: readonly KpiStore[];
  attentionStores: readonly KpiStore[];
  months: readonly Month[];
  contributions: readonly ScoreContribution[];
  availability: DataAvailability;
}

export type OverviewScopeLevel = "REGION" | "AREA" | "STORE";
export interface OverviewHistoryPoint { periodLabel: string; score: number | null }
export interface OverviewRankedScope {
  scopeId: string;
  label: string;
  score: number | null;
  delta: number | null;
}
export interface OverviewDimensionItemScore {
  id: OverviewMetricId;
  earnedPoints: number | null;
  totalPoints: number;
  averageEarnedPoints: number | null;
  averageTotalPoints: number | null;
  delta: number | null;
}
export interface OverviewDimensionScore {
  id: OverviewDimensionId;
  dimensionId: OverviewDimensionId;
  earnedPoints: number | null;
  totalPoints: number;
  averageEarnedPoints: number | null;
  averageTotalPoints: number | null;
  delta: number | null;
  items: readonly OverviewDimensionItemScore[];
}
export interface OverviewScopeComparison {
  id: string;
  rank: number | null;
  rankLabel?: string;
  label: string;
  level: OverviewScopeLevel;
  score: number | null;
  previousScore: number | null;
  delta: number | null;
  earnedPoints: number | null;
  totalPoints: number;
  pointDelta: number | null;
  storeCount: number;
}
export interface OverviewAttentionMember { id: string; label: string }
export interface OverviewAttentionGroup {
  id: string;
  score: number;
  delta: number;
  level: OverviewScopeLevel;
  count: number;
  members: readonly OverviewAttentionMember[];
}
export type OverviewChartDomain = readonly [number, number];
export interface OverviewScopeDetail {
  id: string;
  label: string;
  level: OverviewScopeLevel;
  storeCount: number;
  score: number | null;
  monthlyDelta: number | null;
  monthlyHistory: readonly OverviewHistoryPoint[];
  dimensionScores: readonly OverviewDimensionScore[];
}

export interface OverviewResult {
  availability: DataAvailability;
  stores: readonly KpiStore[];
  storeCount: number;
  scopeLabel: string;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  periodNotice: string;
  scoreRuleVersion: "V1";
  hero: {
    /** Injected current business month; hero score/delta/history do not follow Global Period. */
    scoreMonth: Month;
    overallScore: number | null;
    monthlyDelta: number | null;
    monthlyScoreHistory: readonly OverviewHistoryPoint[];
    improvingRanking: { areas: readonly OverviewRankedScope[]; stores: readonly OverviewRankedScope[] };
    decliningRanking: { areas: readonly OverviewRankedScope[]; stores: readonly OverviewRankedScope[] };
  };
  attentionMatrix: {
    groups: readonly OverviewAttentionGroup[];
    xDomain: OverviewChartDomain;
    yDomain: OverviewChartDomain;
    averageScore: number | null;
  };
  dimensionScores: readonly OverviewDimensionScore[];
  comparisons: readonly OverviewScopeComparison[];
  scopeDetails: readonly OverviewScopeDetail[];
}
