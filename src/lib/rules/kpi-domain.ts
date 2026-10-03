import type { DomainSource, KpiDomainResult, PerformanceDomainValue, AchievementResult } from "@/data/contracts/domain-result";
import type { KpiTrainingRecord, KpiDrillRecord, KpiInspectionRecord, KpiActionClosureRateRecord, KpiStore } from "@/data/contracts/kpi";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type { OverviewRequiredSetProvider } from "@/data/contracts/overview-requirements";
import type { Month } from "@/types/ehs";
import { evaluateRequiredTraining, evaluateExpectedInspections } from "./overview-required-set-rules";
import { evaluateDrillPerformance, sourceStatusCompletion, evaluateActionClosureRate } from "./performance-rules";
import { evaluateAstmOccurrence } from "./event-rules";
import { combineAchievementResults, mostSpecificReason } from "./domain-diagnostics";

export interface KpiDomainInput {
  store: KpiStore;
  months: readonly Month[];
  training: DomainSource<KpiTrainingRecord>;
  drills: DomainSource<KpiDrillRecord>;
  inspections: DomainSource<KpiInspectionRecord>;
  actionClosureRates: DomainSource<KpiActionClosureRateRecord>;
  events: DomainSource<NormalizedEventRecord>;
}
function coverageReason(source: DomainSource<unknown>) {
  return source.reason ?? (source.availability === "UNAVAILABLE" ? "SOURCE_MISSING"
    : source.availability === "INCOMPLETE" ? "SOURCE_INCOMPLETE" : undefined);
}
function performanceValue(source: DomainSource<unknown>, evaluation: AchievementResult): PerformanceDomainValue {
  const reason = mostSpecificReason([evaluation.reason, coverageReason(source)]);
  const result = reason === "ACHIEVED" ? "ACHIEVED" : reason === "RULE_NOT_MET" ? "NOT_ACHIEVED" : "UNDETERMINED";
  return { result, reason, availability: result === "UNDETERMINED" && reason !== "RULE_CONFIGURATION_MISSING" && source.availability !== "UNAVAILABLE" ? "INCOMPLETE" : source.availability };
}

/** One authoritative evaluation; consumers never reinterpret normalized records. */
export function evaluateKpiDomain(input: KpiDomainInput, requirements: OverviewRequiredSetProvider | null): KpiDomainResult {
  const { store, months, training, drills, inspections, actionClosureRates: actions, events } = input;
  const trainingResult = combineAchievementResults(months.map((month) => evaluateRequiredTraining(
    requirements?.getRequiredTrainingItems({ storeId: store.storeId, month }) ?? null,
    training.items.filter((record) => record.month === month), training.availability,
  )));
  const inspectionResult = combineAchievementResults(months.map((month) => evaluateExpectedInspections(
    requirements?.getExpectedInspectionTasks({ storeId: store.storeId, month }) ?? null,
    inspections.items.filter((record) => record.month === month), inspections.availability,
  )));
  const drillResult = evaluateDrillPerformance(months.map((month) => ({
    drillCompletion: drills.items.filter((record) => record.month === month).map((record) => sourceStatusCompletion(record.status)),
  })));
  const drill = performanceValue(drills, { result: drillResult, reason: drillResult === "UNDETERMINED" ? "SOURCE_INCOMPLETE" : drillResult === "ACHIEVED" ? "ACHIEVED" : "RULE_NOT_MET" });

  const value = actions.items.length === 1 ? actions.items[0].value : null;
  const invalid = actions.items.length > 1 || (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100));
  const actionResult = evaluateActionClosureRate(value === null ? { kind: "CONFIRMED_NO_ACTIONS" } : { kind: "RATE", value });
  const actionValue = performanceValue(actions, {
    result: invalid ? "UNDETERMINED" : actionResult,
    reason: invalid ? "SOURCE_INVALID" : actionResult === "ACHIEVED" ? "ACHIEVED" : "RULE_NOT_MET",
  });
  const astmReason = mostSpecificReason([coverageReason(events), events.items.some((record) => !["Yes", "No"].includes(record.astmInjuryIllness)) ? "SOURCE_INVALID" : undefined]);
  const occurrence = astmReason === "ACHIEVED" ? evaluateAstmOccurrence(events.items) : null;
  return {
    store,
    training: performanceValue(training, trainingResult),
    drill,
    inspections: performanceValue(inspections, inspectionResult),
    actions: { ...actionValue, value: actionValue.result === "UNDETERMINED" ? null : value,
      availability: actionValue.result !== "UNDETERMINED" && value === null ? "CONFIRMED_EMPTY" : actionValue.availability },
    astmEvents: { availability: occurrence === null && events.availability !== "UNAVAILABLE" ? "INCOMPLETE" : events.availability,
      result: occurrence, reason: occurrence === null ? astmReason : occurrence === "NOT_OCCURRED" ? "ACHIEVED" : "RULE_NOT_MET" },
  };
}
