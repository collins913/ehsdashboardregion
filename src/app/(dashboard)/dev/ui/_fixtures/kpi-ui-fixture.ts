import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import type { KpiDetailQueries } from "@/features/kpi/kpi-detail-sheet";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import type { KpiDetailRecords, KpiTrainingDetailRecord, KpiDrillDetailRecord, KpiInspectionDetailRecord, KpiAstmDetailRecord } from "@/data/contracts/kpi-details";
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

// Precomputed scenarios, shared by the list and detail stubs. No production rule evaluation here.
function scenario<T>(result: PerformanceResult, details: KpiDetailRecords<T>) {
  return { summary: performance(result, details.availability), details };
}

const completedTraining: readonly [KpiTrainingDetailRecord, KpiTrainingDetailRecord] = [
  { trainingName: "门店安全基础培训", month: "2026-09", completionRate: 100, completionResult: "ACHIEVED", incompletePeople: [] },
  { trainingName: "应急处置培训", month: "2026-08", completionRate: 100, completionResult: "ACHIEVED", incompletePeople: [] },
];
const trainingExamples = {
  completed: scenario<KpiTrainingDetailRecord>("ACHIEVED", { availability: "AVAILABLE", items: completedTraining }),
  pending: scenario<KpiTrainingDetailRecord>("NOT_ACHIEVED", { availability: "AVAILABLE", items: [
    { ...completedTraining[0], completionRate: 92, completionResult: "NOT_ACHIEVED", incompletePeople: ["张晓雨"] },
    completedTraining[1],
  ] }),
  incomplete: scenario<KpiTrainingDetailRecord>("UNDETERMINED", { availability: "INCOMPLETE", items: [
    { ...completedTraining[0], completionRate: null, completionResult: "UNDETERMINED", incompletePeople: null },
  ] }),
};

const completedDrills: readonly [KpiDrillDetailRecord, KpiDrillDetailRecord, KpiDrillDetailRecord] = [
  { drillName: "月度应急演练", month: "2026-07", status: "已完成", completionResult: "ACHIEVED" },
  { drillName: "月度应急演练", month: "2026-08", status: "已完成", completionResult: "ACHIEVED" },
  { drillName: "月度应急演练", month: "2026-09", status: "已完成", completionResult: "ACHIEVED" },
];
const drillExamples = {
  completed: scenario<KpiDrillDetailRecord>("ACHIEVED", { availability: "AVAILABLE", items: completedDrills }),
  pending: scenario<KpiDrillDetailRecord>("NOT_ACHIEVED", { availability: "AVAILABLE", items: [
    completedDrills[0], completedDrills[1],
    { ...completedDrills[2], status: "进行中", completionResult: "NOT_ACHIEVED" },
  ] }),
  unavailable: scenario<KpiDrillDetailRecord>("UNDETERMINED", { availability: "UNAVAILABLE", items: [] }),
};

const completedInspection: KpiInspectionDetailRecord = {
  inspectionNumber: "INP-00001", inspectionName: "月度安全检查", dueDate: "2026-09-20",
  inspector: "陈晨", status: "已完成", completionResult: "ACHIEVED",
};
const inspectionExamples = {
  completed: scenario<KpiInspectionDetailRecord>("ACHIEVED", { availability: "AVAILABLE", items: [completedInspection] }),
  pending: scenario<KpiInspectionDetailRecord>("NOT_ACHIEVED", { availability: "AVAILABLE", items: [
    { ...completedInspection, status: "进行中", completionResult: "NOT_ACHIEVED" },
  ] }),
  empty: scenario<KpiInspectionDetailRecord>("ACHIEVED", { availability: "CONFIRMED_EMPTY", items: [] }),
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

const demoKpiFixtures = storeNames.map((displayName, index) => {
  const storeId = `DEMO-${String(index + 1).padStart(3, "0")}`;
  const training = index === 6 ? trainingExamples.incomplete
    : index % 3 === 1 ? trainingExamples.pending : trainingExamples.completed;
  const drill = index === 7 ? drillExamples.unavailable
    : index % 4 === 2 ? drillExamples.pending : drillExamples.completed;
  const inspections = index % 5 === 3 ? inspectionExamples.empty
    : index % 5 === 1 ? inspectionExamples.pending : inspectionExamples.completed;
  const astm: { summary: AstmKpiValue; details: KpiDetailRecords<KpiAstmDetailRecord> } = index === 4 || index === 10 ? {
    summary: { availability: "AVAILABLE", result: "OCCURRED" },
    details: { availability: "AVAILABLE", items: [{
      storeId, storeDisplayName: displayName, eventId: `EVT-DEMO-${index + 1}`,
      eventType: "Injury/Illness", submittedBy: "王敏", eventDate: "2026-09-05T10:00:00+08:00",
      description: "门店员工受伤事件示例", sourceStatus: "Closed", recordState: "CLOSED", astmInjuryIllness: "Yes",
    }] },
  } : {
    summary: { availability: "CONFIRMED_EMPTY", result: "NOT_OCCURRED" },
    details: { availability: "CONFIRMED_EMPTY", items: [] },
  };

  const row: KpiRow = {
    store: { storeId, displayName, region: "示例区域", area: "示例片区" },
    training: training.summary,
    drill: drill.summary,
    actions: actions(index),
    inspections: inspections.summary,
    astmEvents: astm.summary,
  };
  return {
    row,
    training: training.details,
    drill: drill.details,
    inspections: inspections.details,
    astmEvents: astm.details,
  };
});

export const demoKpiRows: readonly KpiRow[] = demoKpiFixtures.map(({ row }) => row);
const demoKpiDetailsByStore = new Map(demoKpiFixtures.map((fixture) => [fixture.row.store.storeId, fixture]));
const unavailableDetails = { availability: "UNAVAILABLE", items: [] } as const;

export const queryDemoKpiDetails: KpiDetailQueries = {
  training: async ({ query }) => demoKpiDetailsByStore.get(query.storeId)?.training ?? unavailableDetails,
  drill: async ({ query }) => demoKpiDetailsByStore.get(query.storeId)?.drill ?? unavailableDetails,
  inspections: async ({ query }) => demoKpiDetailsByStore.get(query.storeId)?.inspections ?? unavailableDetails,
  astmEvents: async ({ query }) => demoKpiDetailsByStore.get(query.storeId)?.astmEvents ?? unavailableDetails,
};
