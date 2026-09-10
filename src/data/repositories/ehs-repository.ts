import type {
  ActionClosureRateRecord,
  ActionRecord,
  CarWashDrainagePermitRecord,
  CertificateRecord,
  CertificateRequirement,
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

export interface EhsRepository {
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
  listCertificateRequirements(): readonly CertificateRequirement[];
  listCertificateRecords(): readonly CertificateRecord[];
  listWasteContractRecords(): readonly WasteContractRecord[];
  listCarWashDrainagePermitRecords(): readonly CarWashDrainagePermitRecord[];
  listEiaRecords(): readonly EiaRecord[];
  listDischargePermitRecords(): readonly DischargePermitRecord[];
  listEnvironmentalMonitoringRecords(): readonly EnvironmentalMonitoringRecord[];
}
