import { evaluateAstmOccurrence } from "@/lib/rules/event-rules";
import {
  evaluateActionClosureRate,
  evaluateDrillPerformance,
  evaluateInspectionPerformance,
  evaluateTrainingPerformance,
  sourceStatusCompletion,
} from "@/lib/rules/performance-rules";
import type {
  DataAvailability,
  DataSet,
  KpiDataSnapshot,
  EhsFilterContext,
  KpiActionClosureRateRecord,
  KpiDrillRecord,
  KpiInspectionRecord,
  KpiTrainingRecord,
} from "@/data/contracts/kpi";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import type { StoreId } from "@/types/ehs";

type StoreRecordIndex<T> = ReadonlyMap<StoreId, readonly T[]>;

function groupByStoreId<T extends { storeId: StoreId }>(
  items: readonly T[],
): ReadonlyMap<StoreId, readonly T[]> {
  const grouped = new Map<StoreId, T[]>();

  for (const item of items) {
    const records = grouped.get(item.storeId);
    if (records) {
      records.push(item);
    } else {
      grouped.set(item.storeId, [item]);
    }
  }

  return grouped;
}

function scopedAvailability<T>(
  dataSet: DataSet<T>,
  itemCount: number,
): DataAvailability {
  if (dataSet.availability === "UNAVAILABLE") {
    return "UNAVAILABLE";
  }

  if (dataSet.availability === "INCOMPLETE") {
    return "INCOMPLETE";
  }

  return itemCount === 0 ? "CONFIRMED_EMPTY" : "AVAILABLE";
}

function buildTraining(
  data: KpiDataSnapshot["training"],
  recordsByStore: StoreRecordIndex<KpiTrainingRecord>,
  storeId: StoreId,
): PerformanceKpiValue {
  const records = recordsByStore.get(storeId) ?? [];
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: "UNDETERMINED" };
  }

  return {
    availability,
    result: evaluateTrainingPerformance(
      records
        .filter((record) => record.isRequired)
        .map((record) => record.isFullyCompleted),
    ),
  };
}

function buildDrill(
  context: EhsFilterContext,
  data: KpiDataSnapshot["drills"],
  recordsByStore: StoreRecordIndex<KpiDrillRecord>,
  storeId: StoreId,
): PerformanceKpiValue {
  const records = recordsByStore.get(storeId) ?? [];
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: "UNDETERMINED" };
  }

  const monthInputs = context.period.includedMonths.map((month) => ({
    drillCompletion: records
      .filter((record) => record.month === month)
      .map((record) => sourceStatusCompletion(record.status)),
  }));
  const result = evaluateDrillPerformance(monthInputs);

  return {
    availability: result === "UNDETERMINED" ? "INCOMPLETE" : availability,
    result,
  };
}

function buildInspections(
  context: EhsFilterContext,
  data: KpiDataSnapshot["inspections"],
  recordsByStore: StoreRecordIndex<KpiInspectionRecord>,
  storeId: StoreId,
): PerformanceKpiValue {
  const records = recordsByStore.get(storeId) ?? [];
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: "UNDETERMINED" };
  }

  const result = evaluateInspectionPerformance(
    context.period.includedMonths.map((month) => ({
      requiredInspectionCompletion: records
        .filter((record) => record.month === month && record.isRequired)
        .map((record) => sourceStatusCompletion(record.status)),
    })),
  );

  return {
    availability: result === "UNDETERMINED" ? "INCOMPLETE" : availability,
    result,
  };
}

function buildActions(
  rates: KpiDataSnapshot["actionClosureRates"],
  ratesByStore: StoreRecordIndex<KpiActionClosureRateRecord>,
  storeId: StoreId,
): ActionKpiValue {
  const storeRates = ratesByStore.get(storeId) ?? [];
  const availability =
    storeRates.length > 1
      ? "INCOMPLETE"
      : scopedAvailability(rates, storeRates.length);
  const value = availability === "AVAILABLE" ? storeRates[0].value : null;
  const effectiveAvailability =
    availability === "AVAILABLE" && value === null
      ? "CONFIRMED_EMPTY"
      : availability;
  const result =
    effectiveAvailability === "INCOMPLETE" ||
    effectiveAvailability === "UNAVAILABLE"
      ? evaluateActionClosureRate({ kind: "UNDETERMINED" })
      : effectiveAvailability === "CONFIRMED_EMPTY"
        ? evaluateActionClosureRate({ kind: "CONFIRMED_NO_ACTIONS" })
        : value === null
          ? evaluateActionClosureRate({ kind: "UNDETERMINED" })
          : evaluateActionClosureRate({ kind: "RATE", value });
  const finalAvailability =
    effectiveAvailability === "AVAILABLE" && result === "UNDETERMINED"
      ? "INCOMPLETE"
      : effectiveAvailability;

  return {
    availability: finalAvailability,
    value,
    result,
  };
}

function buildAstmEvents(
  data: KpiDataSnapshot["events"],
  recordsByStore: StoreRecordIndex<NormalizedEventRecord>,
  storeId: StoreId,
): AstmKpiValue {
  const records = recordsByStore.get(storeId) ?? [];
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: null };
  }

  return {
    availability,
    result: evaluateAstmOccurrence(
      records.map((record) => ({
        astmInjuryIllness: record.astmInjuryIllness,
      })),
    ),
  };
}

export function buildKpiRows(
  context: EhsFilterContext,
  snapshot: KpiDataSnapshot,
): readonly KpiRow[] {
  const trainingByStore = groupByStoreId(snapshot.training.items);
  const drillsByStore = groupByStoreId(snapshot.drills.items);
  const inspectionsByStore = groupByStoreId(snapshot.inspections.items);
  const actionRatesByStore = groupByStoreId(snapshot.actionClosureRates.items);
  const eventsByStore = groupByStoreId(snapshot.events.items);

  return snapshot.stores.map((store) => ({
    store,
    training: buildTraining(snapshot.training, trainingByStore, store.storeId),
    drill: buildDrill(context, snapshot.drills, drillsByStore, store.storeId),
    actions: buildActions(
      snapshot.actionClosureRates,
      actionRatesByStore,
      store.storeId,
    ),
    inspections: buildInspections(
      context,
      snapshot.inspections,
      inspectionsByStore,
      store.storeId,
    ),
    astmEvents: buildAstmEvents(snapshot.events, eventsByStore, store.storeId),
  }));
}
