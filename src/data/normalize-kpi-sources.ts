import type { StoreReferenceResolver } from "./resolve-store-reference";
import type { TrainingRecord, DrillRecord, InspectionRecord, ActionClosureRateRecord, EventRecord, StoreMasterData, StoreReference, Month } from "@/types/ehs";
import type { KpiTrainingRecord, KpiDrillRecord, KpiInspectionRecord, KpiActionClosureRateRecord } from "./contracts/kpi";
import type { NormalizedEventRecord } from "./contracts/event-record";
import { StorePeriodIndex } from "./store-period-index";
import { interpretShanghaiSourceDateTime, shanghaiMonthForInstant, shanghaiMonthForDate, parseTimezoneAwareInstant } from "./contracts/kpi-period";
import { classifyEventRecordState } from "@/lib/rules/event-rules";

export function sourceIssueStoreIds(reference: StoreReference, stores: readonly StoreMasterData[]) {
  // A conflicting record remains rejected. Its valid primary identity owns the diagnostic.
  const primary = "trtid" in reference ? stores.filter((store) => store.trtid === reference.trtid) : [];
  if (primary.length > 0) return [...new Set(primary.map((store) => store.trtid))];
  const fallback = "storeNameEn" in reference ? stores.filter((store) => store.storeNameEn === reference.storeNameEn) : [];
  return fallback.length === 1 ? [fallback[0].trtid] : [];
}
export interface KpiRawSources {
  trainingRecords: readonly TrainingRecord[];
  drillRecords: readonly DrillRecord[];
  inspectionRecords: readonly InspectionRecord[];
  actionClosureRates: readonly ActionClosureRateRecord[];
  eventRecords: readonly EventRecord[];
}
export function prepareKpiSources(raw: KpiRawSources, stores: readonly StoreMasterData[], resolve: StoreReferenceResolver) {
  const training = new StorePeriodIndex<KpiTrainingRecord>();
  const drills = new StorePeriodIndex<KpiDrillRecord & { drillName: string }>();
  const inspections = new StorePeriodIndex<KpiInspectionRecord & { dueDate: InspectionRecord["dueDate"]; inspector: InspectionRecord["inspector"] }>();
  const events = new StorePeriodIndex<NormalizedEventRecord>();
  const actionIssues = new StorePeriodIndex<never>();
  const actions = new Map<string, StorePeriodIndex<KpiActionClosureRateRecord>>();
  const status = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  const resolveRecord = (reference: StoreReference, month: Month | null, index: StorePeriodIndex<unknown>) => {
    const resolution = resolve(reference);
    if (resolution.kind === "RESOLVED") return resolution.store;
    index.issue(sourceIssueStoreIds(reference, stores), month, "SOURCE_INVALID");
    return null;
  };
  for (const record of raw.trainingRecords) {
    const store = resolveRecord(record.storeReference, record.month, training);
    if (store) training.add(store.trtid, record.month, { storeId: store.trtid, month: record.month,
      trainingName: record.trainingName, completionRate: record.completionRate, incompletePeople: record.incompletePeople });
  }
  for (const record of raw.drillRecords) {
    const store = resolveRecord(record.storeReference, record.month, drills);
    if (!store) continue;
    if (record.status !== null && typeof record.status !== "string") drills.issue([store.trtid], record.month, "SOURCE_INVALID");
    drills.add(store.trtid, record.month, { storeId: store.trtid, month: record.month, drillName: record.drillName, status: status(record.status) });
  }
  for (const record of raw.inspectionRecords) {
    const month = shanghaiMonthForDate(record.dueDate);
    const store = resolveRecord(record.storeReference, month, inspections);
    if (!store) continue;
    if (month === null) {
      inspections.issue([store.trtid], null, !record.dueDate ? "SOURCE_MISSING" : "SOURCE_INVALID");
      continue;
    }
    inspections.add(store.trtid, month, { storeId: store.trtid, month, inspectionNumber: record.inspectionNumber,
      inspectionName: record.inspectionName, dueDate: record.dueDate, inspector: record.inspector, status: status(record.status), sourceStatusInvalid: record.status !== null && typeof record.status !== "string" });
  }
  for (const record of raw.actionClosureRates) {
    const start = parseTimezoneAwareInstant(record.startInclusive);
    const end = parseTimezoneAwareInstant(record.endExclusive);
    if (start === null || end === null || start >= end) {
      const resolution = resolve(record.storeReference);
      actionIssues.issue(resolution.kind === "RESOLVED" ? [resolution.store.trtid] : sourceIssueStoreIds(record.storeReference, stores), null, "SOURCE_INVALID");
      continue;
    }
    const key = `${start}\u0000${end}`;
    const index = actions.get(key) ?? new StorePeriodIndex<KpiActionClosureRateRecord>();
    actions.set(key, index);
    const store = resolveRecord(record.storeReference, null, index);
    if (store) index.add(store.trtid, "AGGREGATE" as Month, { storeId: store.trtid, value: record.value });
  }
  for (const record of raw.eventRecords) {
    const eventDate = interpretShanghaiSourceDateTime(record.eventDate);
    const month = eventDate === null ? null : shanghaiMonthForInstant(eventDate);
    const store = resolveRecord(record.storeReference, month, events);
    if (!store) continue;
    if (eventDate === null || month === null) {
      events.issue([store.trtid], null, record.eventDate ? "SOURCE_INVALID" : "SOURCE_MISSING");
      continue;
    }
    if (!["Yes", "No"].includes(record.ASTMInjuryIllness)) events.issue([store.trtid], month, "SOURCE_INVALID");
    events.add(store.trtid, month, { storeId: store.trtid, storeDisplayName: store.storeNameCn,
      eventId: record.eventId, eventType: record.eventType, submittedBy: record.submittedBy, eventDate,
      description: record.EventDetail.Description, sourceStatus: record.Status, recordState: classifyEventRecordState(record.Status),
      astmInjuryIllness: record.ASTMInjuryIllness, sourceReference: record.sourceReference });
  }
  return { training, drills, inspections, actions, actionIssues, events };
}
