import type { KpiPeriod } from "@/data/contracts/kpi";
import { mockStores } from "@/data/mock/stores";
import type {
  ActionClosureRateRecord,
  Month,
  RawActionRecord,
} from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

const supportedPeriodRates = [92, 68, 85, 74, 96, 81, 59, 88, 91, 77, 84, 70];

function aggregateValue(
  storeIndex: number,
  scope: KpiPeriod,
  supportedMonths: SupportedMonths,
): number {
  if (scope.includedMonths.length === supportedMonths.length) {
    return supportedPeriodRates[storeIndex] ?? 75;
  }

  const startIndex = supportedMonths.indexOf(scope.includedMonths[0]);
  const currentQuarterStart =
    Math.floor((supportedMonths.length - 1) / 3) * 3;
  const isCurrentQuarter =
    startIndex === currentQuarterStart &&
    scope.includedMonths.length === supportedMonths.length - currentQuarterStart;

  if (storeIndex === 0 && isCurrentQuarter) {
    return 92;
  }

  return (
    60 +
    ((storeIndex * 9 + startIndex * 7 + scope.includedMonths.length * 5) % 40)
  );
}

export function createMockActionClosureRates(
  supportedMonths: SupportedMonths,
  aggregateScopes: readonly KpiPeriod[],
): readonly ActionClosureRateRecord[] {
  return mockStores.flatMap((store, storeIndex) =>
    aggregateScopes.map((scope) => ({
      storeReference: { trtid: store.trtid },
      startInclusive: scope.startInclusive,
      endExclusive: scope.endExclusive,
      value: aggregateValue(
        storeIndex,
        scope,
        supportedMonths,
      ),
    } satisfies ActionClosureRateRecord)),
  );
}

export function createMockActionRecords(
  months: SupportedMonths,
): readonly RawActionRecord[] {
  const currentMonth = months[months.length - 1];
  const previousMonth = months[Math.max(0, months.length - 2)];
  const earlierMonth = months[Math.max(0, months.length - 3)];

  return [
    {
      actionId: `ACT-${earlierMonth}-001`,
      storeReference: { trtid: mockStores[0].trtid },
      actionTitle: "补充设备点检记录",
      owner: "测试员工甲",
      createdDate: `${earlierMonth}-05`,
      dueDate: `${earlierMonth}-20`,
      closedDate: null,
      Status: "Assigned",
    },
    {
      actionId: `ACT-${previousMonth}-002`,
      storeReference: { trtid: mockStores[0].trtid },
      actionTitle: "更新疏散标识",
      owner: "测试员工乙",
      createdDate: `${previousMonth}-03`,
      dueDate: `${previousMonth}-18`,
      closedDate: null,
      Status: "In Progress",
    },
    {
      actionId: `ACT-${previousMonth}-003`,
      storeReference: { trtid: mockStores[1].trtid },
      actionTitle: "完成护栏修复",
      owner: "测试员工丙",
      createdDate: `${previousMonth}-03`,
      dueDate: `${previousMonth}-18`,
      closedDate: `${previousMonth}-16`,
      Status: "Closed",
    },
    {
      actionId: `ACT-${previousMonth}-004`,
      storeReference: { trtid: mockStores[1].trtid },
      actionTitle: "取消重复整改项",
      owner: "测试员工丁",
      createdDate: `${previousMonth}-08`,
      dueDate: `${previousMonth}-25`,
      closedDate: null,
      Status: "Cancelled",
    },
    {
      actionId: `ACT-${currentMonth}-005`,
      storeReference: { trtid: mockStores[2].trtid },
      actionTitle: "核对危废标签",
      owner: "测试员工戊",
      createdDate: `${currentMonth}-01`,
      dueDate: `${currentMonth}-15`,
      closedDate: null,
      Status: "In Review",
    },
    {
      actionId: `ACT-${currentMonth}-006`,
      storeReference: { trtid: mockStores[2].trtid },
      actionTitle: "复核应急物资清单",
      owner: "测试员工己",
      createdDate: `${currentMonth}-02`,
      dueDate: `${currentMonth}-16`,
      closedDate: null,
      Status: "Sign Off",
    },
  ] satisfies readonly RawActionRecord[];
}
