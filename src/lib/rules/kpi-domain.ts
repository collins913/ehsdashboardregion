import type { KpiDomainDiagnostics, DomainSource, KpiDomainResult, PerformanceDomainValue, AchievementResult } from "@/data/contracts/domain-result";
import type { KpiTrainingRecord, KpiDrillRecord, KpiInspectionRecord, KpiActionClosureRateRecord, KpiStore } from "@/data/contracts/kpi";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type { OverviewRequiredSetProvider } from "@/data/contracts/overview-requirements";
import type { Month } from "@/types/ehs";
import { evaluateTrainingRecords, evaluateInspectionRecords } from "./training-inspection-rules";
import { evaluateDrillPerformance, sourceStatusCompletion, evaluateActionClosureRate } from "./performance-rules";
import { evaluateAstmOccurrence } from "./event-rules";
import { mostSpecificReason } from "./domain-diagnostics";

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
export function evaluateKpiDomain(input: KpiDomainInput, _legacyRequirements: OverviewRequiredSetProvider | null, diagnostics?: KpiDomainDiagnostics): KpiDomainResult {
  const { store, months, training, drills, inspections, actionClosureRates: actions, events } = input;
  const trainingResult = evaluateTrainingRecords(training.items, training.availability, diagnostics?.training);
  const inspectionResult = evaluateInspectionRecords(inspections.items, inspections.availability, diagnostics?.inspections);
  if (diagnostics) {
    for (const [source, details] of [[training, diagnostics.training], [inspections, diagnostics.inspections]] as const) {
      if (source.reason === "SOURCE_INVALID") details.push("来源记录格式或门店关联无效，无法完整归入当前统计周期");
      else if (source.reason === "SOURCE_MISSING") details.push("来源记录缺少用于归属门店或统计周期的必要信息");
      else if (source.availability === "UNAVAILABLE") details.push("当前统计周期的数据源不可用");
      else if (source.availability === "INCOMPLETE") details.push("当前统计周期的数据覆盖不完整");
    }
  }
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
