import type { Month, StoreId } from "@/types/ehs";

export interface OverviewRequiredSetScope {
  storeId: StoreId;
  month: Month;
}

export interface OverviewRequiredSetProvider {
  getRequiredTrainingItems(scope: OverviewRequiredSetScope): readonly string[] | null;
  getExpectedInspectionTasks(scope: OverviewRequiredSetScope): readonly string[] | null;
}
