import {
  mockActionClosureRates,
  mockActionRecords,
  mockCarWashDrainagePermitRecords,
  mockCertificateRecords,
  mockDischargePermitRecords,
  mockDrillRecords,
  mockEiaRecords,
  mockEnvironmentalMonitoringRecords,
  mockEventRecords,
  mockGoalSummaries,
  mockInspectionRecords,
  mockStores,
  mockTakeChargeParticipationRecords,
  mockTakeChargeRecords,
  mockTrainingRecords,
  mockWasteContractRecords,
} from "@/data/mock";
import { parseActionStatus } from "@/data/parse-action-status";
import type { EhsRepository } from "@/data/repositories/ehs-repository";
import type { ActionRecord, StoreMasterData, StoreReference } from "@/types/ehs";

function matchesStoreReference(
  store: StoreMasterData,
  reference: StoreReference,
): boolean {
  if ("trtid" in reference) {
    return store.trtid === reference.trtid;
  }

  if ("storeNameCn" in reference) {
    return store.storeNameCn === reference.storeNameCn;
  }

  return store.storeNameEn === reference.storeNameEn;
}

const parsedActionRecords: readonly ActionRecord[] = mockActionRecords.map(
  (record) => ({
    ...record,
    Status: parseActionStatus(record.Status),
  }),
);

export const mockEhsRepository: EhsRepository = {
  listStores: () => mockStores,
  findStoreCandidates: (reference) =>
    mockStores.filter((store) => matchesStoreReference(store, reference)),
  listTrainingRecords: () => mockTrainingRecords,
  listDrillRecords: () => mockDrillRecords,
  listInspectionRecords: () => mockInspectionRecords,
  listActionClosureRates: () => mockActionClosureRates,
  listActionRecords: () => parsedActionRecords,
  listEventRecords: () => mockEventRecords,
  listGoalSummaries: () => mockGoalSummaries,
  listTakeChargeRecords: () => mockTakeChargeRecords,
  listTakeChargeParticipationRecords: () =>
    mockTakeChargeParticipationRecords,
  listCertificateRecords: () => mockCertificateRecords,
  listWasteContractRecords: () => mockWasteContractRecords,
  listCarWashDrainagePermitRecords: () =>
    mockCarWashDrainagePermitRecords,
  listEiaRecords: () => mockEiaRecords,
  listDischargePermitRecords: () => mockDischargePermitRecords,
  listEnvironmentalMonitoringRecords: () =>
    mockEnvironmentalMonitoringRecords,
};
