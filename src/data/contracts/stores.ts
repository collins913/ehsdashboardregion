import type { DataSet, EhsStoreScope } from "@/data/contracts/kpi";
import type { StoreFieldDefinition } from "./store-fields";
import type { StoreExtraFieldValue, StoreId } from "@/types/ehs";

export interface NormalizedStoreRecord {
  extraFields?: Readonly<Record<string, StoreExtraFieldValue>>;
  storeId: StoreId;
  storeNameCn: string;
  storeNameEn: string;
  trtid: string;
  region: string;
  area: string;
  regionOwner: string | null;
  regionOwnerEmail: string | null;
  areaOwner: string | null;
  areaOwnerEmail: string | null;
  manager: string | null;
  managerEmail: string | null;
  ehsAmbassador: string | null;
  ehsAmbassadorEmail: string | null;
}

export interface StoresQuery {
  context: EhsStoreScope;
}

export type StoresQueryResult = DataSet<NormalizedStoreRecord> & {
  fieldDefinitions?: readonly StoreFieldDefinition[];
};
