import type { EnvironmentSourceValue, RawEnvironmentRecord, StoreMasterData } from "@/types/ehs";

const values: readonly EnvironmentSourceValue[] = ["有", "无", "不适用"];

// Small current-state source fixture; references come from the existing Store Master.
export function createEnvironmentMockRecords(
  stores: readonly StoreMasterData[],
  storeLimit = 12,
): readonly RawEnvironmentRecord[] {
  return stores.slice(0, storeLimit).map((store, index) => ({
    TRTID: store.trtid,
    "English Store Name": store.storeNameEn,
    环境影响评价: values[index % 3],
    排污许可: values[(index + 1) % 3],
    排水许可: values[(index + 2) % 3],
    环境预案: values[index % 3],
    监测: values[(index + 1) % 3],
    废弃物合同: values[(index + 2) % 3],
  }));
}
