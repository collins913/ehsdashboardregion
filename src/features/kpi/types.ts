import type {
  IsoDate,
  SourceReference,
} from "@/types/ehs";
import type {
  DataAvailability,
  DataSet,
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

export interface KpiActionDetail {
  actionId: string;
  actionTitle: string;
  owner: string;
  createdDate: IsoDate;
  dueDate: IsoDate;
  closedDate: IsoDate | null;
  sourceStatus: string;
  sourceReference?: SourceReference | null;
}

export interface ActionKpiValue {
  availability: DataAvailability;
  value: number | null;
  result: PerformanceResult;
  openActions: DataSet<KpiActionDetail>;
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
