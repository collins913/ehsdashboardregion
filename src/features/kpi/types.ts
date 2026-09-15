import type {
  DataAvailability,
  KpiStore,
} from "@/data/contracts/kpi";
import type {
  OccurrenceResult,
  PerformanceResult,
} from "@/lib/rules/result-types";

export interface PerformanceKpiValue {
  availability: DataAvailability;
  result: PerformanceResult;
}

export interface ActionKpiValue {
  availability: DataAvailability;
  value: number | null;
  result: PerformanceResult;
}

export interface AstmKpiValue {
  availability: DataAvailability;
  result: OccurrenceResult | null;
}

export interface KpiRow {
  store: KpiStore;
  training: PerformanceKpiValue;
  drill: PerformanceKpiValue;
  actions: ActionKpiValue;
  inspections: PerformanceKpiValue;
  astmEvents: AstmKpiValue;
}
