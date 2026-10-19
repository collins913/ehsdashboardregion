import type { ReactNode } from "react";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { StatusDisplay } from "@/components/shared/status-display";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
import { KpiStatusDisplay } from "@/features/kpi/kpi-status-display";
import { getTakeChargeSourceStatusLabel, getTakeChargeStatusIcon } from "@/features/goals/take-charge-status-presentation";
import { CERTIFICATE_CATEGORIES, CERTIFICATE_TYPE_CATEGORIES } from "@/lib/rules/certificate-types";
import type { KnownActionStatus } from "@/types/ehs";

// Explanations of the current implementation, not executable business rules.
// Keep aligned with metric-rules.md and the corresponding server-side rule implementations.
export type LogicRow = { label: ReactNode; condition: string };
export type LogicGroup = {
  id: string;
  title: string;
  types?: readonly string[];
  sections: readonly { title: string; rows: readonly LogicRow[] }[];
  note?: string;
};

const missingSourceRows: readonly LogicRow[] = [
  { label: <DataAvailabilityDisplay availability="INCOMPLETE" />, condition: "已有记录的必要字段缺失、无效，或来源覆盖不完整，无法可靠判断。" },
  { label: <DataAvailabilityDisplay availability="UNAVAILABLE" />, condition: "当前范围的数据源不可用。" },
];
const sourceRecordRows: readonly LogicRow[] = [
  { label: <KpiStatusDisplay status="ACHIEVED" label="已完成" />, condition: "源状态去除首尾空白后，精确等于“已完成”。" },
  { label: <KpiStatusDisplay status="NOT_ACHIEVED" label="进行中" />, condition: "此标签仅为示例。其他非空源状态均按未完成处理，但标签保留源文字，不统一改名。" },
  { label: <KpiStatusDisplay status="UNDETERMINED" label="—" />, condition: "源状态缺失或为空；记录结果未确定，不能当作已完成。" },
];
const certificateSections: LogicGroup["sections"] = [
  { title: "单条证件", rows: [
    { label: <StatusDisplay status="NORMAL" />, condition: "到期日期有效，且不早于业务参考日；当天到期仍为正常。" },
    { label: <StatusDisplay status="ABNORMAL" />, condition: "已过期，或到期日期缺失、格式无效。" },
  ] },
  { title: "门店类别汇总", rows: [
    { label: <StatusDisplay status="NORMAL" />, condition: "该类别至少有一条记录，全部记录正常，且没有来源异常。" },
    { label: <StatusDisplay status="ABNORMAL" />, condition: "该类别没有记录、任一记录异常，或存在来源异常。" },
  ] },
];
const actionStatuses: readonly KnownActionStatus[] = ["Assigned", "In Progress", "In Review", "Sign Off", "Cancelled", "Closed"];
const takeChargeStatuses = [
  { source: "Submitted", state: "OPEN" },
  { source: "InProgress", state: "OPEN" },
  { source: "PendingReview", state: "OPEN" },
  { source: "Declined", state: "CLOSED" },
  { source: "ClosedWithAction", state: "CLOSED" },
  { source: "ClosedWithoutAction", state: "CLOSED" },
] as const;

export const dataLogicGroups: readonly LogicGroup[] = [
  {
    id: "training", title: "培训",
    sections: [
      { title: "所选周期汇总", rows: [
        { label: <KpiStatusDisplay status="ACHIEVED" />, condition: "来源完整有效，实际收到的记录完成率全部为 100%；来源完整且确认无记录时，也为已完成。不要求每月都有记录。" },
        { label: <KpiStatusDisplay status="NOT_ACHIEVED" />, condition: "数据完整有效，且至少一条记录的完成率低于 100%。" },
        ...missingSourceRows,
      ] },
      { title: "单条记录", rows: [
        { label: <KpiStatusDisplay status="ACHIEVED" />, condition: "来源完成率为 100%。" },
        { label: <KpiStatusDisplay status="NOT_ACHIEVED" />, condition: "来源完成率在 0%（含）至 100%（不含）之间。" },
        { label: <KpiStatusDisplay status="UNDETERMINED" />, condition: "完成率缺失、不是有效数字，或超出 0–100。未完成人员名单不用于反算完成率。" },
      ] },
    ],
  },
  {
    id: "drill", title: "演练",
    sections: [
      { title: "所选周期汇总", rows: [
        { label: <KpiStatusDisplay status="ACHIEVED" />, condition: "来源完整有效，每个纳入月份至少一条演练，且每月所有记录均已完成。" },
        { label: <KpiStatusDisplay status="NOT_ACHIEVED" />, condition: "数据完整有效，但有月份没有演练，或任一演练未完成。" },
        ...missingSourceRows,
      ] },
      { title: "单条记录", rows: sourceRecordRows },
    ],
  },
  {
    id: "inspections", title: "检查",
    sections: [
      { title: "所选周期汇总", rows: [
        { label: <KpiStatusDisplay status="ACHIEVED" />, condition: "来源完整有效，实际收到的检查全部已完成；来源完整且确认无记录时，也为已完成。不要求每月都有记录。" },
        { label: <KpiStatusDisplay status="NOT_ACHIEVED" />, condition: "数据完整有效，且至少一条检查的源状态是其他非空文字。" },
        ...missingSourceRows,
      ] },
      { title: "单条记录", rows: sourceRecordRows },
    ],
  },
  {
    id: "actions", title: "行动项",
    sections: [{ title: "明细状态", rows: [
      ...actionStatuses.map((value) => ({ label: <ActionStatusDisplay status={{ kind: "KNOWN", value }} />, condition: `源状态精确为 ${value}。` })),
      { label: <ActionStatusDisplay status={{ kind: "UNKNOWN", value: "" }} />, condition: "源状态不属于上述已识别值，包括空字符串；不根据日期或描述推断状态。" },
    ] }],
    note: "前四种状态属于未关闭；Cancelled 为已排除，Closed 为已关闭。KPI 使用来源汇总关闭率，≥90% 达成，不从明细重算；确认无行动项显示“无”。行动项页图表则用（Closed＋Cancelled）÷全部记录，零记录时为空。",
  },
  {
    id: "events", title: "事件",
    sections: [
      { title: "明细状态", rows: [
        { label: <StatusDisplay status="OPEN" />, condition: "源 Status 精确为 Open。" },
        { label: <StatusDisplay status="CLOSED" />, condition: "源 Status 精确为 Closed。" },
        { label: <StatusDisplay status="UNKNOWN" />, condition: "其他源状态；不由事件日期或 ASTM 标记推断。" },
      ] },
      { title: "KPI：ASTM 发生情况", rows: [
        { label: <StatusDisplay status="OCCURRED" />, condition: "数据完整有效，范围内至少一条事件的 ASTMInjuryIllness 为 Yes。" },
        { label: <StatusDisplay status="NOT_OCCURRED" />, condition: "数据完整有效，范围内没有 Yes；确认无事件也显示“无”。" },
        { label: <DataAvailabilityDisplay availability="INCOMPLETE" />, condition: "ASTM 标记不是有效 Yes / No，或来源覆盖不足；不能把未知当 No。" },
        { label: <DataAvailabilityDisplay availability="UNAVAILABLE" />, condition: "事件数据源不可用。" },
      ] },
    ],
  },
  {
    id: "take-charge", title: "Take Charge",
    sections: [{ title: "明细状态", rows: [
      ...takeChargeStatuses.map(({ source, state }) => ({
        label: <StatusDisplay status={state} label={getTakeChargeSourceStatusLabel(source)} icon={getTakeChargeStatusIcon(state)} />,
        condition: `源状态去除首尾空白后为 ${source}；${state === "CLOSED" ? "计入已关闭" : "计入未关闭"}。`,
      })),
      { label: "其他非空源文字", condition: "保留原文，归为未关闭；不新增终态映射。" },
      { label: <StatusDisplay status="UNKNOWN" />, condition: "源状态缺失、空白或无法解析。" },
    ] }],
    note: "关闭率＝已关闭数÷提交总数；Declined 也计入已关闭。零提交时显示“-”。年度人均提交数 ≥4、年度参与率 ≥50%、关闭率 ≥90% 达成；缺失或无效值不视为达成。",
  },
  ...CERTIFICATE_CATEGORIES.map((category) => ({
    id: `certificate-${category}`, title: `证件 · ${category}`,
    types: Object.entries(CERTIFICATE_TYPE_CATEGORIES).filter(([, group]) => group === category).map(([type]) => type),
    sections: certificateSections,
    note: "同类所有证件类型共用上述规则。证件人数要求、持有数量和未设置目标，不参与正常／异常标签判断。",
  })),
  {
    id: "availability", title: "数据可用性",
    sections: [{ title: "通用标签", rows: [
      { label: <DataAvailabilityDisplay availability="AVAILABLE" />, condition: "已取得当前范围的记录；是否完成或正常，仍按各业务规则判断。" },
      { label: <DataAvailabilityDisplay availability="CONFIRMED_EMPTY" />, condition: "来源完整，确认当前范围没有记录；不是数据缺失。" },
      ...missingSourceRows,
    ] }],
    note: "来源缺失、无效或覆盖不足优先于正常／已完成结论；不同业务的确认无记录处理不同。",
  },
];
