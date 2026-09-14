import type { DataAvailability, DataSet } from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import type { NormalizedActionRecord } from "@/data/contracts/action-record";
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
  "辰岚浮光云庭新城引力场直营跃迁中心",
] as const;

function performance(
  result: PerformanceResult,
  availability: DataAvailability = "AVAILABLE",
): PerformanceKpiValue {
  return { availability, result };
}

function openActions(index: number): DataSet<NormalizedActionRecord> {
  if (index % 4 === 1) {
    return { availability: "CONFIRMED_EMPTY", items: [] };
  }

  const sourceStatus = {
    kind: "KNOWN" as const,
    value: index % 2 === 0 ? "Assigned" as const : "In Progress" as const,
  };
  const action: NormalizedActionRecord = {
    storeId: `DEMO-${String(index + 1).padStart(3, "0")}`,
    storeDisplayName: storeNames[index],
    actionId: `ACT-${String(index + 1).padStart(3, "0")}`,
    problem: "纠正检查发现的问题",
    action: "完成纠正行动跟进",
    submittedBy: "王敏",
    owner: index % 2 === 0 ? "陈晨" : "李敏",
    submittedDate: "2026-09-01T09:15:00+08:00",
    dueDate: "2026-09-20T18:00:00+08:00",
    closedDate: null,
    sourceStatus,
    recordState: "OPEN",
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

  const examples = [
    { value: 92, result: "ACHIEVED" },
    { value: 68, result: "NOT_ACHIEVED" },
    { value: 90, result: "ACHIEVED" },
    { value: 89, result: "NOT_ACHIEVED" },
    { value: 52, result: "NOT_ACHIEVED" },
    { value: null, result: "ACHIEVED" },
    { value: 78, result: "NOT_ACHIEVED" },
    { value: 91, result: "ACHIEVED" },
    { value: null, result: "UNDETERMINED" },
    { value: null, result: "UNDETERMINED" },
    { value: 29, result: "NOT_ACHIEVED" },
    { value: 95, result: "ACHIEVED" },
  ] as const;
  const example = examples[index];

  return {
    availability: example.value === null ? "CONFIRMED_EMPTY" : "AVAILABLE",
    value: example.value,
    result: example.result,
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
      index % 5 === 3 ? "NOT_ACHIEVED" : "ACHIEVED",
      index % 5 === 3 ? "CONFIRMED_EMPTY" : "AVAILABLE",
    ),
    astmEvents: {
      availability: "AVAILABLE",
      result: hasOccurredEvent ? "OCCURRED" : "NOT_OCCURRED",
    },
  };
});
