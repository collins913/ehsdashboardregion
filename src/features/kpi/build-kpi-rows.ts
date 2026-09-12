import { evaluateAstmOccurrence } from "@/lib/rules/event-rules";
import {
  evaluateActionClosureRate,
  evaluateDrillPerformance,
  evaluateInspectionPerformance,
  evaluateTrainingPerformance,
} from "@/lib/rules/performance-rules";
import type {
  DataAvailability,
  DataSet,
  KpiDataSnapshot,
  KpiFilterContext,
} from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import type { StoreId } from "@/types/ehs";

function recordsForStore<T extends { storeId: StoreId }>(
  dataSet: DataSet<T>,
  storeId: StoreId,
): readonly T[] {
  return dataSet.items.filter((item) => item.storeId === storeId);
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
  storeId: StoreId,
): PerformanceKpiValue {
  const records = recordsForStore(data, storeId);
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
  context: KpiFilterContext,
  data: KpiDataSnapshot["drills"],
  storeId: StoreId,
): PerformanceKpiValue {
  const records = recordsForStore(data, storeId);
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: "UNDETERMINED" };
  }

  const monthInputs = context.period.includedMonths.map((month) => ({
    drillCompletion: records
      .filter((record) => record.month === month)
      .map((record) => record.isCompleted),
  }));

  return {
    availability,
    result: evaluateDrillPerformance(monthInputs),
  };
}

function buildInspections(
  context: KpiFilterContext,
  data: KpiDataSnapshot["inspections"],
  storeId: StoreId,
): PerformanceKpiValue {
  const records = recordsForStore(data, storeId);
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: "UNDETERMINED" };
  }

  return {
    availability,
    result: evaluateInspectionPerformance(
      context.period.includedMonths.map((month) => ({
        requiredInspectionCompletion: records
          .filter((record) => record.period === month && record.isRequired)
          .map((record) => record.isCompleted),
      })),
    ),
  };
}

function dataSetForStore<T extends { storeId: StoreId }>(
  data: DataSet<T>,
  storeId: StoreId,
): DataSet<T> {
  const items = recordsForStore(data, storeId);

  if (data.availability === "UNAVAILABLE") {
    return { availability: "UNAVAILABLE", items: [] };
  }

  if (data.availability === "INCOMPLETE") {
    return { availability: "INCOMPLETE", items };
  }

  if (items.length === 0) {
    return { availability: "CONFIRMED_EMPTY", items: [] };
  }

  return {
    availability: "AVAILABLE",
    items: items as readonly [T, ...T[]],
  };
}

function buildActions(
  rates: KpiDataSnapshot["actionClosureRates"],
  actionRecords: KpiDataSnapshot["actions"],
  storeId: StoreId,
): ActionKpiValue {
  const storeRates = recordsForStore(rates, storeId);
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
    openActions: dataSetForStore(actionRecords, storeId),
  };
}

function buildAstmEvents(
  data: KpiDataSnapshot["events"],
  storeId: StoreId,
): AstmKpiValue {
  const records = recordsForStore(data, storeId);
  const availability = scopedAvailability(data, records.length);

  if (availability === "UNAVAILABLE" || availability === "INCOMPLETE") {
    return { availability, result: null };
  }

  return {
    availability,
    result: evaluateAstmOccurrence(records),
  };
}

export function buildKpiRows(
  context: KpiFilterContext,
  snapshot: KpiDataSnapshot,
): readonly KpiRow[] {
  return snapshot.stores.map((store) => ({
    store,
    training: buildTraining(snapshot.training, store.storeId),
    drill: buildDrill(context, snapshot.drills, store.storeId),
    actions: buildActions(
      snapshot.actionClosureRates,
      snapshot.actions,
      store.storeId,
    ),
    inspections: buildInspections(context, snapshot.inspections, store.storeId),
    astmEvents: buildAstmEvents(snapshot.events, store.storeId),
  }));
}
