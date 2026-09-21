"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OverviewDemoViewModel } from "../model/overview-demo-types"
import { OverviewDemoAttentionChart } from "./overview-demo-charts"

export function AttentionMatrix({
  matrix,
  onSelect,
}: {
  matrix: OverviewDemoViewModel["attentionMatrix"]
  onSelect: (id: string) => void
}) {
  return (
    <Card className="gap-3 py-5 shadow-none" data-testid="attention-matrix">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="text-lg tracking-tight">管理关注矩阵</CardTitle>
        <CardDescription>X 轴为当前得分，Y 轴为较上期变化；用于观察当前表现与变化趋势。</CardDescription>
      </CardHeader>
      <CardContent className="px-5 sm:px-6">
        <div className="overflow-hidden rounded-xl border" data-detail-trigger="matrix"><OverviewDemoAttentionChart points={matrix.points} xDomain={matrix.xDomain} yDomain={matrix.yDomain} averageScore={matrix.averageScore} onSelect={onSelect} /></div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>同级平均分 {matrix.averageScore ?? "—"}</span><span>较上期持平</span></div>
      </CardContent>
    </Card>
  )
}
