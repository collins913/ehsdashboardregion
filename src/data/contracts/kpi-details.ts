import type { EhsFilterContext, DataSet } from "@/data/contracts/kpi";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type { IsoDate, Month, StoreId } from "@/types/ehs";

export interface KpiDetailQuery {
  context: EhsFilterContext;
  storeId: StoreId;
}

export interface KpiTrainingDetailRecord {
  trainingName: string;
  month: Month;
  completionRate: number | null;
  incompletePeople: readonly string[] | null;
}

export interface KpiDrillDetailRecord {
  drillName: string;
  month: Month;
  status: string | null;
}

export interface KpiInspectionDetailRecord {
  inspectionName: string;
  dueDate: IsoDate | null;
  inspector: string | null;
  status: string | null;
}

export type KpiDetailRecords<T> = DataSet<T>;

export type KpiAstmDetailRecord = NormalizedEventRecord;
