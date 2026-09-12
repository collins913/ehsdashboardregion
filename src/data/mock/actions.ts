import type { KpiPeriod } from "@/data/contracts/kpi";
import { mockStores } from "@/data/mock/stores";
import type {
  ActionClosureRateRecord,
  IsoDate,
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
  const supplementalRecords = [
    {
      sequence: "007",
      storeIndex: 0,
      month: earlierMonth,
      day: "07",
      Status: "In Review",
      problem: "冷库温度复核记录缺少值班经理确认。",
      action: "补充复核签名并确认温度异常升级流程。",
    },
    {
      sequence: "008",
      storeIndex: 3,
      month: earlierMonth,
      day: "09",
      Status: "In Progress",
      problem: "配电间门口临时堆放清洁工具。",
      action: "清理通道并划定禁止堆放区域。",
    },
    {
      sequence: "009",
      storeIndex: 2,
      month: earlierMonth,
      day: "11",
      Status: "Assigned",
      problem: "消防泵房巡检表缺少一周记录。",
      action: "补齐巡检并由设施负责人核验设备状态。",
    },
    {
      sequence: "010",
      storeIndex: 3,
      month: earlierMonth,
      day: "13",
      Status: "Sign Off",
      problem: "化学品分装容器未标注启用日期。",
      action: "更新全部分装标签并提交现场照片签核。",
    },
    {
      sequence: "011",
      storeIndex: 0,
      month: previousMonth,
      day: "06",
      Status: "Assigned",
      problem: "员工通道防滑垫边缘翘起。",
      action: "更换防滑垫并检查相邻通道地面状况。",
    },
    {
      sequence: "012",
      storeIndex: 2,
      month: previousMonth,
      day: "10",
      Status: "In Progress",
      problem: "高位货架限载标识褪色。",
      action: "重新制作并安装清晰的限载标识。",
    },
    {
      sequence: "013",
      storeIndex: 2,
      month: previousMonth,
      day: "12",
      Status: "In Review",
      problem: "承包商入场培训签到信息不完整。",
      action: "核对人员名单，补充培训证明并由项目负责人复核。",
    },
    {
      sequence: "014",
      storeIndex: 3,
      month: previousMonth,
      day: "14",
      Status: "Sign Off",
      problem: "卸货平台警示线局部磨损。",
      action: "重新施划警示线并完成区域隔离验收。",
    },
    {
      sequence: "015",
      storeIndex: 0,
      month: currentMonth,
      day: "04",
      Status: "Assigned",
      problem: "急救箱内两项物资临近有效期。",
      action: "更换临期物资并更新月度检查清单。",
    },
    {
      sequence: "016",
      storeIndex: 0,
      month: currentMonth,
      day: "05",
      Status: "In Progress",
      problem: "后场插座保护盖损坏且附近存在潮湿作业，可能增加人员接触带电部件的风险。",
      action: "停止使用该插座，更换保护盖，完成绝缘检查后由设施负责人确认恢复使用条件。",
    },
    {
      sequence: "017",
      storeIndex: 3,
      month: currentMonth,
      day: "07",
      Status: "In Review",
      problem: "垃圾房消杀记录未按班次更新。",
      action: "补充记录并明确每班责任人。",
    },
    {
      sequence: "018",
      storeIndex: 2,
      month: currentMonth,
      day: "08",
      Status: "Closed",
      problem: "应急照明测试记录遗漏。",
      action: "完成补测并归档测试结果。",
    },
    {
      sequence: "019",
      storeIndex: 3,
      month: currentMonth,
      day: "09",
      Status: "Cancelled",
      problem: "整改项与既有工单重复。",
      action: "核实重复关系后取消本记录。",
    },
    {
      sequence: "020",
      storeIndex: 1,
      month: currentMonth,
      day: "10",
      Status: "Pending Verification",
      problem: "新工作流状态尚未纳入状态字典。",
      action: "保留原始状态并等待数据契约确认。",
    },
  ] as const;

  return [
    {
      actionId: "ACT-1000001",
      storeReference: {
        trtid: mockStores[0].trtid,
        storeNameEn: mockStores[0].storeNameEn,
      },
      problem:
        "设备日常点检记录缺少关键检查项和复核签名，无法确认当班检查是否完整执行。",
      action: "补充缺失的设备点检项目，完成负责人复核并归档签字记录。",
      submittedBy: "测试提交人甲",
      owner: "测试员工甲",
      submittedDate: `${earlierMonth}-05`,
      dueDate: `${earlierMonth}-20`,
      closedDate: null,
      Status: "Assigned",
    },
    {
      actionId: "ACT-1000002",
      storeReference: { storeNameEn: mockStores[0].storeNameEn },
      problem: "后场疏散路线调整后，部分方向标识未同步更新。",
      action: "按照最新疏散路线更新标识并完成现场照片确认。",
      submittedBy: "测试提交人乙",
      owner: "测试员工乙",
      submittedDate: `${previousMonth}-03`,
      dueDate: `${previousMonth}-18`,
      closedDate: null,
      Status: "In Progress",
    },
    {
      actionId: "ACT-1000003",
      storeReference: {
        trtid: mockStores[1].trtid,
        storeNameEn: mockStores[1].storeNameEn,
      },
      problem: "装卸区防护栏连接件松动。",
      action: "更换连接件并完成护栏稳固性检查。",
      submittedBy: "测试提交人丙",
      owner: "测试员工丙",
      submittedDate: `${previousMonth}-03`,
      dueDate: `${previousMonth}-18`,
      closedDate: `${previousMonth}-16`,
      Status: "Closed",
    },
    {
      actionId: "ACT-1000004",
      storeReference: {
        trtid: mockStores[1].trtid,
        storeNameEn: mockStores[1].storeNameEn,
      },
      problem: "同一问题被重复提交。",
      action: "确认重复记录并取消本行动项。",
      submittedBy: "测试提交人丁",
      owner: "测试员工丁",
      submittedDate: `${previousMonth}-08`,
      dueDate: `${previousMonth}-25`,
      closedDate: null,
      Status: "Cancelled",
    },
    {
      actionId: "ACT-1000005",
      storeReference: {
        trtid: mockStores[2].trtid,
        storeNameEn: mockStores[2].storeNameEn,
      },
      problem: "危废暂存区部分容器标签信息不完整。",
      action: "核对容器内容并补全危废类别、日期和责任人信息。",
      submittedBy: "测试提交人戊",
      owner: "测试员工戊",
      submittedDate: `${currentMonth}-01`,
      dueDate: `${currentMonth}-15`,
      closedDate: null,
      Status: "In Review",
    },
    {
      actionId: "ACT-1000006",
      storeReference: {
        trtid: mockStores[2].trtid,
        storeNameEn: mockStores[2].storeNameEn,
      },
      problem: "应急物资盘点清单与现场数量存在差异。",
      action: "重新盘点应急物资，更新清单并由门店负责人签核。",
      submittedBy: "测试提交人己",
      owner: "测试员工己",
      submittedDate: `${currentMonth}-02`,
      dueDate: `${currentMonth}-16`,
      closedDate: null,
      Status: "Sign Off",
    },
    ...supplementalRecords.map((record, index) => ({
      actionId:
        record.sequence === "020"
          ? "ACT-12345678"
          : `ACT-${1000000 + Number(record.sequence)}`,
      storeReference: {
        trtid: mockStores[record.storeIndex].trtid,
        storeNameEn: mockStores[record.storeIndex].storeNameEn,
      },
      problem: record.problem,
      action: record.action,
      submittedBy: `测试提交人${index + 7}`,
      owner: `测试负责人${index + 7}`,
      submittedDate: `${record.month}-${record.day}` as IsoDate,
      dueDate:
        `${record.month}-${String(Number(record.day) + 12).padStart(2, "0")}` as IsoDate,
      closedDate:
        record.Status === "Closed" ? (`${record.month}-20` as IsoDate) : null,
      Status: record.Status,
    })),
  ] satisfies readonly RawActionRecord[];
}
