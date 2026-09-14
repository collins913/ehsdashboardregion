import type {
  ActionClosureRateRecord,
  ActionRecord,
  CarWashDrainagePermitRecord,
  CertificateRecord,
  DischargePermitRecord,
  DrillRecord,
  EiaRecord,
  EnvironmentalMonitoringRecord,
  EventRecord,
  InspectionRecord,
  StoreMasterData,
  StoreReference,
  TrainingRecord,
  WasteContractRecord,
} from "@/types/ehs";
import type {
  KpiDataSnapshot,
  KpiFilterContext,
  KpiStore,
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

export interface EhsRepository {
  getKpiData(context: KpiFilterContext): KpiDataSnapshot;
  getActions(query: ActionsQuery): ActionsQueryResult;
  getEvents(query: EventsQuery): EventsQueryResult;
  getTakeChargeGoals(query: TakeChargeGoalsQuery): TakeChargeGoalsSummary;
  getTakeChargeRecords(query: TakeChargeRecordsQuery): TakeChargeRecordsResult;
  getStores(query: StoresQuery): StoresQueryResult;
  listFilterStores(): readonly KpiStore[];
  listStores(): readonly StoreMasterData[];
  findStoreCandidates(reference: StoreReference): readonly StoreMasterData[];
  listTrainingRecords(): readonly TrainingRecord[];
  listDrillRecords(): readonly DrillRecord[];
  listInspectionRecords(): readonly InspectionRecord[];
  listActionClosureRates(): readonly ActionClosureRateRecord[];
  listActionRecords(): readonly ActionRecord[];
  listEventRecords(): readonly EventRecord[];
  listCertificateRecords(): readonly CertificateRecord[];
  listWasteContractRecords(): readonly WasteContractRecord[];
  listCarWashDrainagePermitRecords(): readonly CarWashDrainagePermitRecord[];
  listEiaRecords(): readonly EiaRecord[];
  listDischargePermitRecords(): readonly DischargePermitRecord[];
  listEnvironmentalMonitoringRecords(): readonly EnvironmentalMonitoringRecord[];
}
