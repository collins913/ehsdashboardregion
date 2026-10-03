import type { KpiDataSnapshot, EhsFilterContext } from "@/data/contracts/kpi";
import type { KpiRow } from "./types";

/** Presentation only: all business conclusions already belong to Domain Results. */
export function buildKpiRows(_context: EhsFilterContext, snapshot: KpiDataSnapshot): readonly KpiRow[] {
  return snapshot.domainResults.map(({ store, training, drill, actions, inspections, astmEvents }) => ({
    store,
    training: { availability: training.availability, result: training.result },
    drill: { availability: drill.availability, result: drill.result },
    actions: { availability: actions.availability, result: actions.result, value: actions.value },
    inspections: { availability: inspections.availability, result: inspections.result },
    astmEvents: { availability: astmEvents.availability, result: astmEvents.result },
  }));
}
