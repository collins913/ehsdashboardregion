"use client"

import { dataTableColumnAlignmentClassNames } from "@/components/shared/data-table-layout"
import { cn } from "@/lib/utils"
import { OverflowTooltip } from "@/components/shared/overflow-tooltip"
import { TableCellTrigger } from "@/components/shared/table-cell-trigger"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { OverviewResult } from "@/data/contracts/overview"
import { OverviewSectionHeader } from "./overview-section-header"
import { OverviewAttentionChart } from "./overview-charts"
import { formatOverviewScore, ScoreChange } from "./score-change"

export function AttentionMatrix({ matrix, onSelect, selectedScopeId }: {
  matrix: OverviewResult["attentionMatrix"]
  onSelect: (id: string, trigger?: HTMLElement | null) => void
  comparisonLabel: string
  selectedScopeId?: string
}) {
  const members = matrix.groups.flatMap((group) => group.members.map((member) => ({ ...member, score: group.score, delta: group.delta })))
  const hasSelectedPeer = selectedScopeId && members.length > 1 && members.some((member) => member.id === selectedScopeId)
  return (
    <Card className="h-full min-h-0 min-w-0" data-testid="attention-matrix">
      <Tabs defaultValue="matrix" className="min-h-0 flex-1 gap-4">
        <OverviewSectionHeader title="同级得分与变化" subtitle={`同级平均得分率 ${matrix.averageScore === null ? "—" : `${formatOverviewScore(matrix.averageScore)}%`}`} description="横轴为当前得分率（%），纵轴为得分变化率（%）。参考线表示同级平均得分率和 0%。"
          action={members.length > 0 ? <TabsList aria-label="同级比较显示方式"><TabsTrigger value="matrix">矩阵</TabsTrigger><TabsTrigger value="list">明细</TabsTrigger></TabsList> : null} />
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col">
          {members.length === 0 ? <p className="flex h-60 items-center justify-center text-sm text-muted-foreground">无可比较数据</p> : <>
            {hasSelectedPeer ? <p className="mb-3 shrink-0 text-xs text-muted-foreground">摘要为当前门店；此处比较范围包含同级门店。</p> : null}
            <TabsContent value="list" className="min-h-60 flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <Table className="table-fixed" aria-label="同级得分与变化明细">
                  <colgroup><col /><col className="w-20" /><col className="w-24" /></colgroup>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead className="text-right">得分率</TableHead><TableHead className="text-right">变化</TableHead></TableRow></TableHeader>
                  <TableBody>{members.map((member) => <TableRow key={member.id}>
                    <TableCell className={cn("py-2", dataTableColumnAlignmentClassNames.left)}>
                      <div className="flex min-w-0 items-center gap-2">
                        <OverflowTooltip text={member.label} className="flex-1 font-medium" renderTrigger={(label) => (
                          <TableCellTrigger className="min-w-0 flex-1 justify-start text-left" aria-current={member.id === selectedScopeId ? "true" : undefined} aria-label={`查看${member.label}详情`} onClick={(event) => onSelect(member.id, event.currentTarget)}>{label}</TableCellTrigger>
                        )} />
                        {member.id === selectedScopeId ? <span className="shrink-0 text-xs text-muted-foreground">当前门店</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{formatOverviewScore(member.score)}%</TableCell>
                    <TableCell className="py-2 text-right"><ScoreChange value={member.delta} /></TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="matrix" className="min-h-60 flex-1">
              <div className="h-full min-h-0" data-detail-trigger="matrix"><OverviewAttentionChart groups={matrix.groups} xDomain={matrix.xDomain} yDomain={matrix.yDomain} averageScore={matrix.averageScore} onSelect={onSelect} /></div>
            </TabsContent>
          </>}
        </CardContent>
      </Tabs>
    </Card>
  )
}
