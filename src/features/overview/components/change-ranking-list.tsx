"use client"

import type { ReactNode } from "react"
import { OverflowTooltip } from "@/components/shared/overflow-tooltip"
import { Button } from "@/components/ui/button"
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
          <TableBody>{entries.map((item, index) => {
            const content = (name: ReactNode) => <>
              <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
              {name}
              <span className="text-left text-sm tabular-nums text-muted-foreground">{item.score === null ? "—" : `${formatOverviewRate(item.score)}%`}</span>
              <span className="text-left text-sm font-medium"><ScoreChange value={item.delta} /></span>
            </>
            return <TableRow key={item.scopeId} className="h-8 hover:bg-transparent">
              <TableCell colSpan={4} className="px-0 py-0">
                <OverflowTooltip text={item.label} className="font-medium text-left" renderTrigger={(name) => onSelect ? <Button type="button" variant="ghost" size="sm"
                  className="grid w-full min-w-0 cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_5rem] gap-0 px-0 text-left font-normal"
                  aria-label={`查看${item.label}${label}第${index + 1}名详情`}
                  onClick={() => onSelect(item.scopeId)}
                >{content(name)}</Button> : <div className="grid h-7 grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_5rem] items-center">{content(name)}</div>} />
              </TableCell>
            </TableRow>
          })}
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
