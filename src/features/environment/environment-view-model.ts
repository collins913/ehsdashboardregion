import { storeScopeQueryKey } from "@/features/global-filters/global-filter-state";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";

export const ENVIRONMENT_ITEMS = [
  { key: "environmentalImpactAssessment", label: "环境影响评价" },
  { key: "dischargePermit", label: "排污许可" },
  { key: "drainagePermit", label: "排水许可" },
  { key: "emergencyPlan", label: "环境预案" },
  { key: "monitoring", label: "监测" },
  { key: "wasteContract", label: "废弃物合同" },
] as const;

export type EnvironmentItemKey = typeof ENVIRONMENT_ITEMS[number]["key"];

export function buildEnvironmentDetail(record: NormalizedEnvironmentRecord, key: EnvironmentItemKey) {
  return {
    storeDisplayName: record.storeDisplayName,
    itemName: ENVIRONMENT_ITEMS.find((item) => item.key === key)!.label,
    value: record[key],
  };
}

export type EnvironmentDetail = ReturnType<typeof buildEnvironmentDetail>;

export function environmentQueryKey(context: EhsStoreScope | null, referenceDateIso: string) {
  return storeScopeQueryKey(context, referenceDateIso);
}
