import type { DataSet, EhsFilterContext } from "@/data/contracts/kpi";
import type { EnvironmentSourceValue, StoreId } from "@/types/ehs";

export interface NormalizedEnvironmentRecord {
  storeId: StoreId;
  storeDisplayName: string;
  environmentalImpactAssessment: EnvironmentSourceValue;
  dischargePermit: EnvironmentSourceValue;
  drainagePermit: EnvironmentSourceValue;
  emergencyPlan: EnvironmentSourceValue;
  monitoring: EnvironmentSourceValue;
  wasteContract: EnvironmentSourceValue;
}

export interface EnvironmentQuery {
  context: EhsFilterContext;
}

export type EnvironmentQueryResult = DataSet<NormalizedEnvironmentRecord>;
