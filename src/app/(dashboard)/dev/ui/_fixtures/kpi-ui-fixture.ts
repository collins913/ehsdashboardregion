import type { DataAvailability, DataSet } from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  KpiActionDetail,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import type { PerformanceResult } from "@/lib/rules/result-types";

const storeNames = [
  "中央广场店",
  "海港城店",
  "北角店",
  "滨河店",
  "南门店",
  "西市场店",
  "湖景店",
  "东广场店",
  "山城店",
  "花园店",
  "都会店",
  "公园大道店",
] as const;

function performance(
  result: PerformanceResult,
  availability: DataAvailability = "AVAILABLE",
): PerformanceKpiValue {
  return { availability, result };
}

function openActions(index: number): DataSet<KpiActionDetail> {
  if (index % 4 === 1) {
    return { availability: "CONFIRMED_EMPTY", items: [] };
  }

  const action: KpiActionDetail = {
    actionId: `ACT-${String(index + 1).padStart(3, "0")}`,
    actionTitle: "完成纠正行动跟进",
    owner: index % 2 === 0 ? "陈晨" : "李敏",
    createdDate: "2026-09-01",
    dueDate: "2026-09-20",
    closedDate: null,
    sourceStatus: index % 2 === 0 ? "Assigned" : "InProgress",
  };

  return { availability: "AVAILABLE", items: [action] };
}

function actions(index: number): ActionKpiValue {
  if (index === 8) {
    return {
      availability: "UNAVAILABLE",
      value: null,
      result: "UNDETERMINED",
      openActions: { availability: "UNAVAILABLE", items: [] },
    };
  }

  if (index === 9) {
    return {
      availability: "INCOMPLETE",
      value: null,
      result: "UNDETERMINED",
      openActions: { availability: "INCOMPLETE", items: [] },
    };
  }

  return {
    availability: index === 5 ? "CONFIRMED_EMPTY" : "AVAILABLE",
    value: index === 5 ? null : (index * 13) % 101,
    result: "UNDETERMINED",
    openActions: openActions(index),
  };
}

export const demoKpiRows: readonly KpiRow[] = storeNames.map((displayName, index) => {
  const hasNegativeResult = index % 3 === 1;
  const hasOccurredEvent = index === 4 || index === 10;

  return {
    store: {
      storeId: `DEMO-${String(index + 1).padStart(3, "0")}`,
      displayName,
      region: "示例区域",
      area: "示例片区",
    },
    training:
      index === 6
        ? performance("UNDETERMINED", "INCOMPLETE")
        : performance(hasNegativeResult ? "NOT_ACHIEVED" : "ACHIEVED"),
    drill:
      index === 7
        ? performance("UNDETERMINED", "UNAVAILABLE")
        : performance(index % 4 === 2 ? "NOT_ACHIEVED" : "ACHIEVED"),
    actions: actions(index),
    inspections: performance(
      index % 5 === 3 ? "UNDETERMINED" : "ACHIEVED",
      index % 5 === 3 ? "CONFIRMED_EMPTY" : "AVAILABLE",
    ),
    astmEvents: {
      availability: "AVAILABLE",
      result: hasOccurredEvent ? "OCCURRED" : "NOT_OCCURRED",
    },
  };
});
