import { useMemo } from "react"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { OverflowTooltip } from "@/components/shared/overflow-tooltip"
import { TableCellTrigger } from "@/components/shared/table-cell-trigger"
import { Card, CardContent } from "@/components/ui/card"
import type { OverviewScopeComparison } from "@/data/contracts/overview"
import { OverviewSectionHeader } from "./overview-section-header"
import { formatOverviewRate, formatOverviewScore, ScoreChange } from "./score-change"

export function ScopeComparison({ comparisons, onSelect, semanticKey, comparisonLabel }: {
  comparisons: readonly OverviewScopeComparison[]
  onSelect: (id: string, trigger?: HTMLElement | null) => void
  semanticKey: string
  comparisonLabel: string
}) {
  const columns = useMemo<DataTableColumn<OverviewScopeComparison>[]>(() => [
    { id: "scope", title: "门店", value: (row) => row.label, sizeRole: "primary",
      render: (row) => <OverflowTooltip text={row.label} className="flex-1 font-medium" renderTrigger={(label) =>
        <TableCellTrigger data-detail-trigger="scope" aria-label={`查看${row.label}得分详情`} className="w-full justify-start text-left" onClick={() => onSelect(row.id)}>{label}</TableCellTrigger>
      } /> },
    { id: "rank", title: "排名", value: (row) => row.rankLabel ?? "—", sizeRole: "compact", align: "right", sortValue: (row) => row.rank },
    { id: "scoreRate", title: "得分率", value: (row) => row.score === null ? "—" : `${formatOverviewRate(row.score)}%`, sizeRole: "compact", align: "right", sortValue: (row) => row.score },
    { id: "rateChange", title: "得分率变化", value: (row) => formatOverviewScore(row.delta), sizeRole: "compact", align: "right", sortValue: (row) => row.delta,
      render: (row) => <ScoreChange value={row.delta} /> },
    { id: "points", title: "得分数", value: (row) => `${formatOverviewScore(row.earnedPoints)}/${formatOverviewScore(row.totalPoints)}`, sizeRole: "compact", align: "right", sortValue: (row) => row.earnedPoints },
    { id: "pointChange", title: "得分变化（分）", value: (row) => formatOverviewScore(row.pointDelta), sizeRole: "compact", align: "right", sortValue: (row) => row.pointDelta,
      render: (row) => <ScoreChange value={row.pointDelta} suffix="" /> },
  ], [onSelect])
  return <Card>
    <OverviewSectionHeader title="门店得分清单" description={`当前筛选范围全部门店的得分率、得分率变化、总得分/总指标数量与得分变化。所有 12 项指标均进入分母；缺失、无效或不完整数据计 0 分。${comparisonLabel}；得分率变化 = 当前得分率 − 上一个自然月得分率，使用 % 标记且不是相对增长率；得分变化为总得分差值。`} />
    <CardContent>
      <DataTable rows={comparisons} columns={columns} semanticKey={semanticKey} stickyFirstColumn compactPrimaryColumn emptyMessage="当前筛选范围没有门店。"
        onRowClick={(row, trigger) => onSelect(row.id, trigger)} rowAriaLabel={(row) => `查看${row.label}得分详情`} />
    </CardContent>
  </Card>
}
