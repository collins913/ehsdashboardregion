"use client"

import { dataTableColumnAlignmentClassNames } from "@/components/shared/data-table-layout"
import { cn } from "@/lib/utils"
import { OverflowTooltip } from "@/components/shared/overflow-tooltip"
import { TableCellTrigger } from "@/components/shared/table-cell-trigger"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OverviewRankedScope } from "@/data/contracts/overview"
import { formatOverviewRate, ScoreChange } from "./score-change"

export function ChangeRankingList({ improving, declining, onSelect }: {
  improving: readonly OverviewRankedScope[]
  declining: readonly OverviewRankedScope[]
  onSelect?: (id: string) => void
}) {
  const section = (entries: readonly OverviewRankedScope[], label: string) => (
    <section aria-label={`${label} Top 3`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm text-muted-foreground"><h3 className="font-medium tracking-tight">{label} Top 3</h3>{label === "提升" ? <div className="flex" aria-hidden="true"><span className="w-14 text-left">得分率</span><span className="w-20 text-left">变化</span></div> : null}</div>
        <Table className="table-fixed" aria-label={`${label}排名`}>
          <colgroup><col className="w-6" /><col /><col className="w-14" /><col className="w-20" /></colgroup>
          <TableHeader className="sr-only"><TableRow><TableHead>名次</TableHead><TableHead>名称</TableHead><TableHead>得分率</TableHead><TableHead>变化</TableHead></TableRow></TableHeader>
          <TableBody>{entries.map((item, index) => <TableRow key={item.scopeId} className="h-8">
            <TableCell className="px-0 py-0 text-sm tabular-nums text-muted-foreground">{index + 1}</TableCell>
            <TableCell className={cn("min-w-0 px-0 py-0", dataTableColumnAlignmentClassNames.left)}>
              <OverflowTooltip text={item.label} className="flex-1 font-medium" renderTrigger={(name) => (
                <TableCellTrigger disabled={!onSelect} className="w-full justify-start text-left" aria-label={`查看${item.label}${label}第${index + 1}名详情`} onClick={() => onSelect?.(item.scopeId)}>{name}</TableCellTrigger>
              )} />
            </TableCell>
            <TableCell className="px-0 py-0 text-left text-sm tabular-nums text-muted-foreground">{item.score === null ? "—" : `${formatOverviewRate(item.score)}%`}</TableCell>
            <TableCell className="px-0 py-0 text-left text-sm font-medium"><ScoreChange value={item.delta} /></TableCell>
          </TableRow>)}
          {Array.from({ length: Math.max(0, 3 - entries.length) }, (_, index) => <TableRow key={`empty-${index}`} className="h-8 hover:bg-transparent" aria-label={`${label}第${entries.length + index + 1}位暂无对象`}>
            <TableCell className="px-0 py-0 tabular-nums text-muted-foreground">{entries.length + index + 1}</TableCell>
            <TableCell className="px-0 py-0 text-muted-foreground">{improving.length === 0 && declining.length === 0 && label === "提升" && index === 0 ? "无可比较数据" : "—"}</TableCell>
            <TableCell className="px-0 py-0 text-left text-muted-foreground">—</TableCell>
            <TableCell className="px-0 py-0 text-left text-muted-foreground">—</TableCell>
          </TableRow>)}
          </TableBody>
        </Table>
    </section>
  )

  return <div className="space-y-4" data-testid="change-ranking-list">
    {section(improving, "提升")}
    {section(declining, "退步")}
  </div>
}
