"use client"

import { formatOverviewScore } from "./score-change"
import { Card, CardContent } from "@/components/ui/card"
import { OverviewSectionHeader } from "./overview-section-header"
import type { OverviewResult } from "@/data/contracts/overview"
import { OverviewAttentionChart } from "./overview-charts"

export function AttentionMatrix({
  matrix,
  onSelect,
}: {
  matrix: OverviewResult["attentionMatrix"]
  onSelect: (id: string) => void
}) {
  return (
    <Card className="gap-3 py-5 shadow-none" data-testid="attention-matrix">
      <OverviewSectionHeader title="得分与变化" description="横轴为当前得分，纵轴为与上期分差；参考线表示同级平均得分和 0 分差。" className="px-5 sm:px-6" />
      <CardContent className="px-5 sm:px-6">
        <div className="overflow-hidden rounded-xl border" data-detail-trigger="matrix"><OverviewAttentionChart groups={matrix.groups} xDomain={matrix.xDomain} yDomain={matrix.yDomain} averageScore={matrix.averageScore} onSelect={onSelect} /></div>
        <div className="mt-3 text-xs text-muted-foreground">同级平均分 {formatOverviewScore(matrix.averageScore)}</div>
      </CardContent>
    </Card>
  )
}
