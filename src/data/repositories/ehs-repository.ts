import type {
  KpiDataSnapshot,
  KpiStore,
  EhsFilterContext,
} from "@/data/contracts/kpi";
import type {
  ActionsQuery,
  ActionsQueryResult,
} from "@/data/contracts/actions";
import type { EventsQuery, EventsQueryResult } from "@/data/contracts/events";
import type {
  TakeChargeGoalsQuery,
  TakeChargeGoalsSummary,
  TakeChargeRecordsQuery,
  TakeChargeRecordsResult,
} from "@/data/contracts/take-charge";
import type { StoresQuery, StoresQueryResult } from "@/data/contracts/stores";
import type { EnvironmentQuery, EnvironmentQueryResult } from "@/data/contracts/environment";
import type { CertificatesQuery, CertificatesQueryResult } from "@/data/contracts/certificates";
import type {
  KpiDetailQuery,
  KpiDetailRecords,
  KpiTrainingDetailRecord,
  KpiDrillDetailRecord,
  KpiInspectionDetailRecord,
  KpiAstmDetailRecord,
} from "@/data/contracts/kpi-details";

export interface KpiQueries {
  getKpiData(context: EhsFilterContext): Promise<KpiDataSnapshot>;
  getKpiTrainingDetails(
    query: KpiDetailQuery,
  ): Promise<KpiDetailRecords<KpiTrainingDetailRecord>>;
  getKpiDrillDetails(
    query: KpiDetailQuery,
  ): Promise<KpiDetailRecords<KpiDrillDetailRecord>>;
  getKpiInspectionDetails(
    query: KpiDetailQuery,
  ): Promise<KpiDetailRecords<KpiInspectionDetailRecord>>;
  getKpiAstmDetails(
    query: KpiDetailQuery,
  ): Promise<KpiDetailRecords<KpiAstmDetailRecord>>;
}

export interface ActionsQueries {
  getActions(query: ActionsQuery): Promise<ActionsQueryResult>;
}

export interface EventsQueries {
  getEvents(query: EventsQuery): Promise<EventsQueryResult>;
}

export interface TakeChargeQueries {
  getTakeChargeGoals(
    query: TakeChargeGoalsQuery,
  ): Promise<TakeChargeGoalsSummary>;
  getTakeChargeRecords(
    query: TakeChargeRecordsQuery,
  ): Promise<TakeChargeRecordsResult>;
}

export interface StoresQueries {
  getStores(query: StoresQuery): Promise<StoresQueryResult>;
}

export interface EnvironmentQueries {
  getEnvironment(query: EnvironmentQuery): Promise<EnvironmentQueryResult>;
}

export interface GlobalFilterQueries {
  getFilterStores(): Promise<readonly KpiStore[]>;
}

export interface CertificatesQueries {
  getCertificates(query: CertificatesQuery): Promise<CertificatesQueryResult>;
}

export interface EhsRepository
  extends KpiQueries,
    ActionsQueries,
    EventsQueries,
    TakeChargeQueries,
    StoresQueries,
    EnvironmentQueries,
    CertificatesQueries,
    GlobalFilterQueries {}
