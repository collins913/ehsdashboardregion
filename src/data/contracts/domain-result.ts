import type { DataAvailability, KpiStore } from "./kpi";
import type { OccurrenceResult, PerformanceResult } from "@/lib/rules/result-types";

export type DomainReason = "ACHIEVED" | "RULE_NOT_MET" | "SOURCE_MISSING" | "SOURCE_INVALID" | "SOURCE_INCOMPLETE" | "NOT_APPLICABLE" | "RULE_CONFIGURATION_MISSING";

export interface AchievementResult {
  result: PerformanceResult;
  reason: DomainReason;
}

export interface PerformanceDomainValue extends AchievementResult {
  availability: DataAvailability;
}

export interface KpiDomainResult {
  store: KpiStore;
  training: PerformanceDomainValue;
  drill: PerformanceDomainValue;
  actions: PerformanceDomainValue & { value: number | null };
  inspections: PerformanceDomainValue;
  astmEvents: { availability: DataAvailability; result: OccurrenceResult | null; reason: DomainReason };
}

/** A query slice's coverage and diagnostics belong to one Store and period. */
export interface DomainSource<T> {
  items: readonly T[];
  availability: DataAvailability;
  reason?: DomainReason;
}
