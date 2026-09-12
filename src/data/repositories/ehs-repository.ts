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
  GoalSummary,
  InspectionRecord,
  StoreMasterData,
  StoreReference,
  TakeChargeParticipationRecord,
  TakeChargeRecord,
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

export interface EhsRepository {
  getKpiData(context: KpiFilterContext): KpiDataSnapshot;
  getActions(query: ActionsQuery): ActionsQueryResult;
  listFilterStores(): readonly KpiStore[];
  listStores(): readonly StoreMasterData[];
  findStoreCandidates(reference: StoreReference): readonly StoreMasterData[];
  listTrainingRecords(): readonly TrainingRecord[];
  listDrillRecords(): readonly DrillRecord[];
  listInspectionRecords(): readonly InspectionRecord[];
  listActionClosureRates(): readonly ActionClosureRateRecord[];
  listActionRecords(): readonly ActionRecord[];
  listEventRecords(): readonly EventRecord[];
  listGoalSummaries(): readonly GoalSummary[];
  listTakeChargeRecords(): readonly TakeChargeRecord[];
  listTakeChargeParticipationRecords(): readonly TakeChargeParticipationRecord[];
  listCertificateRecords(): readonly CertificateRecord[];
  listWasteContractRecords(): readonly WasteContractRecord[];
  listCarWashDrainagePermitRecords(): readonly CarWashDrainagePermitRecord[];
  listEiaRecords(): readonly EiaRecord[];
  listDischargePermitRecords(): readonly DischargePermitRecord[];
  listEnvironmentalMonitoringRecords(): readonly EnvironmentalMonitoringRecord[];
}
