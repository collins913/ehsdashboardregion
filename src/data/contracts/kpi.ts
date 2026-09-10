import type {
  ActionRecord,
  Month,
  StoreId,
} from "@/types/ehs";

export type NonEmptySelection<T> = readonly [T, ...T[]];

export type FilterScope<T> =
  | { kind: "ALL" }
  | { kind: "INCLUDE"; values: NonEmptySelection<T> };

export type TimezoneAwareIsoDateTime =
  | `${string}T${string}Z`
  | `${string}T${string}${"+" | "-"}${string}:${string}`;

export interface KpiPeriod {
  startInclusive: TimezoneAwareIsoDateTime;
  endExclusive: TimezoneAwareIsoDateTime;
  includedMonths: NonEmptySelection<Month>;
}

export interface KpiFilterContext {
  region: FilterScope<string>;
  area: FilterScope<string>;
  store: FilterScope<StoreId>;
  period: KpiPeriod;
}

export type DataAvailability =
  | "AVAILABLE"
  | "CONFIRMED_EMPTY"
  | "INCOMPLETE"
  | "UNAVAILABLE";

export type DataSet<T> =
  | {
      availability: "AVAILABLE";
      items: readonly [T, ...T[]];
    }
  | {
      availability: "CONFIRMED_EMPTY";
      items: readonly [];
    }
  | {
      availability: "INCOMPLETE";
      items: readonly T[];
    }
  | {
      availability: "UNAVAILABLE";
      items: readonly [];
    };

export interface KpiStore {
  storeId: StoreId;
  displayName: string;
  region: string;
  area: string;
}

export interface KpiTrainingRecord {
  storeId: StoreId;
  month: Month;
  isRequired: boolean;
  isFullyCompleted: boolean;
}

export interface KpiDrillRecord {
  storeId: StoreId;
  month: Month;
  isCompleted: boolean;
}

export interface KpiInspectionRecord {
  storeId: StoreId;
  period: Month;
  isRequired: boolean;
  isCompleted: boolean;
}

export interface KpiActionClosureRateRecord {
  storeId: StoreId;
  value: number | null;
}

export interface KpiActionRecord extends Omit<ActionRecord, "storeReference"> {
  storeId: StoreId;
}

export interface KpiEventRecord {
  storeId: StoreId;
  ASTMInjuryIllness: string;
}

export interface KpiDataSnapshot {
  stores: readonly KpiStore[];
  training: DataSet<KpiTrainingRecord>;
  drills: DataSet<KpiDrillRecord>;
  inspections: DataSet<KpiInspectionRecord>;
  actionClosureRates: DataSet<KpiActionClosureRateRecord>;
  actions: DataSet<KpiActionRecord>;
  events: DataSet<KpiEventRecord>;
}
