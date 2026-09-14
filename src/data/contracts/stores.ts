import type { DataSet, KpiFilterContext } from "@/data/contracts/kpi";
import type { StoreId } from "@/types/ehs";

export interface NormalizedStoreRecord {
  storeId: StoreId;
  storeNameCn: string;
  storeNameEn: string;
  trtid: string;
  region: string;
  area: string;
  manager: string;
  ehsAmbassador: string;
}

export interface StoresQuery {
  context: KpiFilterContext;
}

export type StoresQueryResult = DataSet<NormalizedStoreRecord>;
