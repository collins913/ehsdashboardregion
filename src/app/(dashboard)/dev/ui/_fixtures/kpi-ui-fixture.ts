import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import type { KpiDetailQueries } from "@/features/kpi/kpi-detail-sheet";
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

function openActions(index: number): readonly NormalizedActionRecord[] {
  if (index % 4 === 1) {
    return [];
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

  return [action];
}

const demoOpenActions = storeNames.flatMap((_, index) => openActions(index));

export const demoKpiContext: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: {
    startInclusive: "2026-07-01T00:00:00+08:00",
    endExclusive: "2026-10-01T00:00:00+08:00",
    includedMonths: ["2026-07", "2026-08", "2026-09"],
  },
};

export async function queryDemoKpiActions({
  query,
}: {
  referenceDateIso: string;
  query: ActionsQuery;
}): Promise<ActionsQueryResult> {
  const selectedStoreIds =
    query.context.store.kind === "INCLUDE"
      ? new Set(query.context.store.values)
      : null;
  const items = selectedStoreIds
    ? demoOpenActions.filter(({ storeId }) => selectedStoreIds.has(storeId))
    : demoOpenActions;

  return {
    availability: items.length === 0 ? "CONFIRMED_EMPTY" : "AVAILABLE",
    items,
    totalCount: items.length,
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
  };
}

export const queryDemoKpiDetails: KpiDetailQueries = {
  training: async () => ({
    availability: "AVAILABLE",
    items: [
      {
        trainingName: "门店安全基础培训",
        month: "2026-09",
        completionRate: 92,
        incompletePeople: ["张晓雨"],
      },
      {
        trainingName: "应急处置培训",
        month: "2026-08",
        completionRate: 100,
        incompletePeople: [],
      },
    ],
  }),
  drill: async () => ({
    availability: "AVAILABLE",
    items: [
      { drillName: "消防疏散演练", month: "2026-09", status: "已完成" },
      { drillName: "应急响应演练", month: "2026-08", status: "待确认" },
    ],
  }),
  inspections: async () => ({
    availability: "AVAILABLE",
    items: [
      {
        inspectionName: "月度安全检查",
        dueDate: "2026-09-20",
        inspector: "陈晨",
        status: "已完成",
      },
    ],
  }),
  astmEvents: async () => ({ availability: "CONFIRMED_EMPTY", items: [] }),
};

function actions(index: number): ActionKpiValue {
  if (index === 8) {
    return {
      availability: "UNAVAILABLE",
      value: null,
      result: "UNDETERMINED",
    };
  }

  if (index === 9) {
    return {
      availability: "INCOMPLETE",
      value: null,
      result: "UNDETERMINED",
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
