import { classifyActionRecordState } from "@/lib/rules/action-rules";
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
  KpiActionRecord,
  KpiDataSnapshot,
  KpiFilterContext,
} from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiActionDetail,
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

function toActionDetail(action: KpiActionRecord): KpiActionDetail {
  return {
    actionId: action.actionId,
    actionTitle: action.actionTitle,
    owner: action.owner,
    createdDate: action.createdDate,
    dueDate: action.dueDate,
    closedDate: action.closedDate,
    sourceStatus: action.Status.value,
    sourceReference: action.sourceReference,
  };
}

function buildOpenActions(
  data: KpiDataSnapshot["actions"],
  storeId: StoreId,
): DataSet<KpiActionDetail> {
  const storeActions = recordsForStore(data, storeId);
  const openActions = storeActions
    .filter((action) => classifyActionRecordState(action) === "OPEN")
    .map(toActionDetail);

  if (data.availability === "UNAVAILABLE") {
    return { availability: "UNAVAILABLE", items: [] };
  }

  if (data.availability === "INCOMPLETE") {
    return { availability: "INCOMPLETE", items: openActions };
  }

  if (openActions.length === 0) {
    return { availability: "CONFIRMED_EMPTY", items: [] };
  }

  return {
    availability: "AVAILABLE",
    items: openActions as [KpiActionDetail, ...KpiActionDetail[]],
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
    openActions: buildOpenActions(actionRecords, storeId),
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
