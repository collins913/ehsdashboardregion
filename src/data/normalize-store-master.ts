import type { KpiStore } from "@/data/contracts/kpi";
import type { StoreMasterData } from "@/types/ehs";

export function toKpiStore(store: StoreMasterData): KpiStore {
  return { storeId: store.trtid, displayName: store.storeNameCn, region: store.region, area: store.area };
}
