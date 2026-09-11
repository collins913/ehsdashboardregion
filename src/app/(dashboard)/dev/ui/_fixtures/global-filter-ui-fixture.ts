import type { KpiStore } from "@/data/contracts/kpi";
import type { GlobalFilterState } from "@/features/global-filters/global-filter-state";

export const globalFilterUiStores = [
  {
    storeId: "ui-store-001",
    displayName: "示例超长门店名称用于验证筛选触发器与下拉选项文本截断",
    region: "北辰区",
    area: "北辰一部",
  },
  {
    storeId: "ui-store-002",
    displayName: "示例星河店",
    region: "北辰区",
    area: "北辰二部",
  },
  {
    storeId: "ui-store-003",
    displayName: "示例海湾店",
    region: "南屿区",
    area: "南屿一部",
  },
] satisfies readonly KpiStore[];

export const crossYearGlobalFilterUiState: GlobalFilterState = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "INCLUDE", values: ["ui-store-001"] },
  period: {
    mode: "CUSTOM",
    startMonth: "2025-11",
    endMonth: "2026-02",
  },
};
