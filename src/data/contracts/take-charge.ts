import type { KpiFilterContext, KpiPeriod, DataAvailability } from "@/data/contracts/kpi";
import type { PerformanceResult, RecordState } from "@/lib/rules/result-types";
import type { SourceReference, StoreId, TimezoneAwareIsoDateTime } from "@/types/ehs";

export type TakeChargeExtraFieldValue = string | number | boolean | null;
export type TakeChargeFieldValueType =
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "DATE"
  | "DATETIME";

export interface TakeChargeFieldDefinition {
  key: string;
  label: string;
  valueType: TakeChargeFieldValueType;
  defaultVisible: false;
}

export interface NormalizedTakeChargeRecord {
  storeId: StoreId;
  storeDisplayName: string;
  tchId: string;
  submittedBy: string;
  submittedAt: TimezoneAwareIsoDateTime;
  summary: string;
  sourceStatus: string;
  recordState: RecordState;
  extraFields: Readonly<Record<string, TakeChargeExtraFieldValue>>;
  sourceReference?: SourceReference | null;
}

export type TakeChargeViewMode = "OPEN_ONLY" | "ALL";
export type TakeChargeSortKey =
  | "store"
  | "tchId"
  | "submittedBy"
  | "submittedAt"
  | "status";
export type TakeChargeSortDirection = "asc" | "desc";

export interface TakeChargeRecordsQuery {
  context: KpiFilterContext;
  viewMode: TakeChargeViewMode;
  sorting?: {
    key: TakeChargeSortKey;
    direction: TakeChargeSortDirection;
  };
  pageIndex: number;
  pageSize: number;
}

export interface TakeChargeRecordsResult {
  availability: DataAvailability;
  items: readonly NormalizedTakeChargeRecord[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  fieldDefinitions: readonly TakeChargeFieldDefinition[];
}

export interface TakeChargeMetricValue {
  value: number | null;
  result: PerformanceResult;
}

export interface TakeChargePeriodMetrics {
  availability: DataAvailability;
  period: KpiPeriod;
  submissionTotal: number | null;
  closedCount: number | null;
  closeRate: TakeChargeMetricValue;
}

export interface TakeChargeAnnualMetrics {
  availability: DataAvailability;
  currentYear: number;
  averageSubmissionsYtd: TakeChargeMetricValue;
  participationRateYtd: TakeChargeMetricValue;
}

export interface TakeChargeGoalsSummary {
  period: TakeChargePeriodMetrics;
  annual: TakeChargeAnnualMetrics;
}

export interface TakeChargeGoalsQuery {
  context: KpiFilterContext;
}

export interface TakeChargeMonthlyAggregate {
  storeId: StoreId;
  month: `${number}-${number}`;
  totalCount: number;
  closedCount: number;
}

export interface TakeChargeAnnualMetricContribution {
  storeId: StoreId;
  year: number;
  submissionsNumerator: number;
  submissionsDenominator: number;
  participationNumerator: number;
  participationDenominator: number;
}
