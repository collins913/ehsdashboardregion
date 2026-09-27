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

const ENVIRONMENT_WASTE_CONTRACT_CATEGORIES = [
  { type: "hazardousWaste", label: "危险废物处置合同" },
  { type: "generalIndustrialSolidWaste", label: "一般工业固体废物处置合同" },
] as const;

export type EnvironmentWasteContractGroup = {
  value: (typeof ENVIRONMENT_WASTE_CONTRACT_CATEGORIES)[number]["type"];
  label: string;
  count: number;
  records: readonly EnvironmentWasteContract[];
  disabled: boolean;
};

function prepareWasteContractGroups(
  wasteContracts: NormalizedEnvironmentRecord["wasteContracts"],
) {
  const groups = ENVIRONMENT_WASTE_CONTRACT_CATEGORIES.map(({ type, label }) => {
    const records = wasteContracts[type];
    return { value: type, label, count: records.length, records, disabled: records.length === 0 };
  });

  return {
    groups,
    defaultOpenValues: groups.filter((group) => !group.disabled).map((group) => group.value),
  };
}

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
  | { kind: "wasteContracts"; label: "废弃物合同"; storeDisplayName: string; data: ReturnType<typeof prepareWasteContractGroups> };

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
      return {
        kind,
        label: "废弃物合同",
        storeDisplayName: record.storeDisplayName,
        data: prepareWasteContractGroups(record.wasteContracts),
      };
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
