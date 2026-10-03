import type { KpiDomainResult } from "./domain-result";
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

export interface EhsStoreScope {
  region: FilterScope<string>;
  area: FilterScope<string>;
  store: FilterScope<StoreId>;
}

export interface EhsFilterContext extends EhsStoreScope {
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
  trainingName: string;
  completionRate: number | null;
  incompletePeople: readonly string[] | null;
}

export interface KpiDrillRecord {
  storeId: StoreId;
  month: Month;
  status: string | null;
}

export interface KpiInspectionRecord {
  storeId: StoreId;
  inspectionNumber: string;
  inspectionName: string;
  status: string | null;
  sourceStatusInvalid?: boolean;
  month: Month;
}

export interface KpiActionClosureRateRecord {
  storeId: StoreId;
  value: number | null;
}

export interface KpiDataSnapshot {
  domainResults: readonly KpiDomainResult[];
  stores: readonly KpiStore[];
  training: DataSet<KpiTrainingRecord>;
  drills: DataSet<KpiDrillRecord>;
  inspections: DataSet<KpiInspectionRecord>;
  actionClosureRates: DataSet<KpiActionClosureRateRecord>;
  events: DataSet<NormalizedEventRecord>;
}
