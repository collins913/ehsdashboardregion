import type { TakeChargeFieldDefinition } from "@/data/contracts/take-charge";
import type { MockTakeChargeAnnualAggregateFixture } from "@/data/mock/take-charge";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import type { KpiMockCoverage } from "@/data/mock/kpi-coverage";
import type { MockProfile } from "@/data/mock/mock-profile";
import { getPerformanceMockDataset } from "@/data/mock/performance";
import type {
  ActionClosureRateRecord,
  DrillRecord,
  EventRecord,
  InspectionRecord,
  Month,
  RawActionRecord,
  RawEnvironmentRecord,
  RawCertificateRecord,
  StoreMasterData,
  TakeChargeRecord,
  TrainingRecord,
} from "@/types/ehs";
import type { KpiPeriod } from "@/data/contracts/kpi";

export interface MockDataset {
  stores: readonly StoreMasterData[];
  supportedPeriod: KpiPeriod;
  supportedMonths: readonly [Month, ...Month[]];
  coverage: KpiMockCoverage;
  trainingRecords: readonly TrainingRecord[];
  drillRecords: readonly DrillRecord[];
  inspectionRecords: readonly InspectionRecord[];
  actionClosureRates: readonly ActionClosureRateRecord[];
  actionRecords: readonly RawActionRecord[];
  eventRecords: readonly EventRecord[];
  environmentRecords: readonly RawEnvironmentRecord[];
  certificateRecords: readonly RawCertificateRecord[];
  takeChargeRecords: readonly TakeChargeRecord[];
  takeChargeAnnualAggregateFixtures: readonly MockTakeChargeAnnualAggregateFixture[];
  takeChargeFieldDefinitions: readonly TakeChargeFieldDefinition[];
}

export function getMockDataset(
  profile: MockProfile,
  referenceDate: Date,
): MockDataset {
  return profile === "standard"
    ? createKpiMockData(referenceDate)
    : getPerformanceMockDataset(referenceDate);
}
