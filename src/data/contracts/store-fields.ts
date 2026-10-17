import type { NormalizedStoreRecord } from "./stores";

export interface StoreFieldDefinition {
  key: string;
  label: string;
  source: "record" | "extra";
}

export const STORE_FIELD_DEFINITIONS: readonly StoreFieldDefinition[] = [
  { key: "region", label: "区域", source: "record" },
  { key: "area", label: "小区", source: "record" },
  { key: "trtid", label: "TRTID", source: "record" },
  { key: "manager", label: "门店经理", source: "record" },
  { key: "ehsAmbassador", label: "EHS&S 代表", source: "record" },
  { key: "storeNameEn", label: "英文门店名", source: "record" },
  { key: "regionOwner", label: "区域负责人", source: "record" },
  { key: "regionOwnerEmail", label: "区域负责人邮箱", source: "record" },
  { key: "areaOwner", label: "小区负责人", source: "record" },
  { key: "areaOwnerEmail", label: "小区负责人邮箱", source: "record" },
  { key: "managerEmail", label: "门店经理邮箱", source: "record" },
  { key: "ehsAmbassadorEmail", label: "EHS&S 代表邮箱", source: "record" },
];

// Call only after the server has scoped and normalized Store records.
export function storeFieldDefinitions(records: readonly NormalizedStoreRecord[]): readonly StoreFieldDefinition[] {
  const keys = new Set(records.flatMap((record) => Object.keys(record.extraFields ?? {})));
  return [
    ...STORE_FIELD_DEFINITIONS,
    ...[...keys].map((key): StoreFieldDefinition => ({ key, label: key, source: "extra" })),
  ];
}

export function storeFieldColumnId(field: StoreFieldDefinition): string {
  return field.source === "extra" ? `extra:${field.key}` : field.key;
}
