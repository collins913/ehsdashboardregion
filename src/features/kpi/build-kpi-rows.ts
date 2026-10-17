import type { KpiDataSnapshot, EhsFilterContext } from "@/data/contracts/kpi";
import type { KpiPageResult, KpiRow } from "./types";

/** Presentation only: all business conclusions already belong to Domain Results. */
export function buildKpiRows(_context: EhsFilterContext, snapshot: KpiDataSnapshot): readonly KpiRow[] {
  const diagnostics = new Map(snapshot.diagnostics?.map((item) => [item.storeId, item]));
  return snapshot.domainResults.map(({ store, training, drill, actions, inspections, astmEvents }) => ({
    store,
    training: { availability: training.availability, result: training.result, ...(diagnostics.get(store.storeId)?.training.length ? { diagnostics: diagnostics.get(store.storeId)!.training } : {}) },
    drill: { availability: drill.availability, result: drill.result },
    actions: { availability: actions.availability, result: actions.result, value: actions.value },
    inspections: { availability: inspections.availability, result: inspections.result, ...(diagnostics.get(store.storeId)?.inspections.length ? { diagnostics: diagnostics.get(store.storeId)!.inspections } : {}) },
    astmEvents: { availability: astmEvents.availability, result: astmEvents.result },
  }));
}

/** Query-level source diagnostics do not change individual Store results. */
export function buildKpiPageResult(context: EhsFilterContext, snapshot: KpiDataSnapshot): KpiPageResult {
  const rows = buildKpiRows(context, snapshot);
  const sources = [snapshot.training, snapshot.drills, snapshot.inspections, snapshot.actionClosureRates, snapshot.events];
  const availability = sources.every((source) => source.availability === "UNAVAILABLE")
    ? "UNAVAILABLE"
    : sources.some((source) => source.availability === "INCOMPLETE" || source.availability === "UNAVAILABLE")
      ? "INCOMPLETE"
      : rows.length > 0 ? "AVAILABLE" : "CONFIRMED_EMPTY";
  return { rows, availability };
}
