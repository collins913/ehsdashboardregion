import type {
  Month,
  StoreId,
  TimezoneAwareIsoDateTime,
} from "@/types/ehs";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";

export type { TimezoneAwareIsoDateTime } from "@/types/ehs";

export type NonEmptySelection<T> = readonly [T, ...T[]];

export type FilterScope<T> =
  | { kind: "ALL" }
  | { kind: "INCLUDE"; values: NonEmptySelection<T> };

export interface KpiPeriod {
  startInclusive: TimezoneAwareIsoDateTime;
  endExclusive: TimezoneAwareIsoDateTime;
  includedMonths: NonEmptySelection<Month>;
}

export interface EhsFilterContext {
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

export interface KpiDataSnapshot {
  stores: readonly KpiStore[];
  training: DataSet<KpiTrainingRecord>;
  drills: DataSet<KpiDrillRecord>;
  inspections: DataSet<KpiInspectionRecord>;
  actionClosureRates: DataSet<KpiActionClosureRateRecord>;
  events: DataSet<NormalizedEventRecord>;
}
