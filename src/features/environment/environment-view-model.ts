import type {
  EnvironmentDischargePermit,
  EnvironmentDrainagePermit,
  EnvironmentEmergencyPlan,
  EnvironmentFacilityInformation,
  EnvironmentImpactAssessment,
  EnvironmentMonitoring,
  EnvironmentWasteContract,
  NormalizedEnvironmentRecord,
} from "@/data/contracts/environment";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import { storeScopeQueryKey } from "@/features/global-filters/global-filter-state";

export const ENVIRONMENT_DETAILS = [
  { kind: "facility", label: "设施信息" },
  { kind: "environmentalLicenses", label: "环保证照" },
  { kind: "emergencyPlan", label: "应急预案" },
  { kind: "monitoring", label: "监测" },
  { kind: "wasteContracts", label: "废弃物合同" },
] as const;

export type EnvironmentDetailKind =
  (typeof ENVIRONMENT_DETAILS)[number]["kind"];

export type EnvironmentDetail =
  | { kind: "facility"; label: "设施信息"; storeDisplayName: string; data: EnvironmentFacilityInformation }
  | { kind: "environmentalLicenses"; label: "环保证照"; storeDisplayName: string; data: { environmentalImpactAssessment: EnvironmentImpactAssessment; dischargePermit: EnvironmentDischargePermit; drainagePermit: EnvironmentDrainagePermit } }
  | { kind: "emergencyPlan"; label: "应急预案"; storeDisplayName: string; data: EnvironmentEmergencyPlan }
  | { kind: "monitoring"; label: "监测"; storeDisplayName: string; data: EnvironmentMonitoring }
  | { kind: "wasteContracts"; label: "废弃物合同"; storeDisplayName: string; data: { hazardousWaste: readonly EnvironmentWasteContract[]; generalIndustrialSolidWaste: readonly EnvironmentWasteContract[] } };

export function buildEnvironmentDetail(
  record: NormalizedEnvironmentRecord,
  kind: EnvironmentDetailKind,
): EnvironmentDetail {
  switch (kind) {
    case "facility":
      return { kind, label: "设施信息", storeDisplayName: record.storeDisplayName, data: record.facilityInformation };
    case "environmentalLicenses":
      return { kind, label: "环保证照", storeDisplayName: record.storeDisplayName, data: record.environmentalLicenses };
    case "emergencyPlan":
      return { kind, label: "应急预案", storeDisplayName: record.storeDisplayName, data: record.emergencyPlan };
    case "monitoring":
      return { kind, label: "监测", storeDisplayName: record.storeDisplayName, data: record.monitoring };
    case "wasteContracts":
      return { kind, label: "废弃物合同", storeDisplayName: record.storeDisplayName, data: record.wasteContracts };
  }
}

export function displayEnvironmentValue(value: string | number | null): string {
  return value === null || (typeof value === "string" && value.length === 0)
    ? "—"
    : String(value);
}

export function displayTonnesPerYear(value: number | null): string {
  return value === null ? "—" : `${value} 吨/年`;
}

export function environmentQueryKey(context: EhsStoreScope | null) {
  return storeScopeQueryKey(context);
}
