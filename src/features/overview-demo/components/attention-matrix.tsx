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
        <CardTitle className="text-lg tracking-tight">Attention Matrix</CardTitle>
        <CardDescription>X 轴为当前得分，Y 轴为较上期变化；象限仅用于本页相对管理观察。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
        <div className="overflow-hidden rounded-xl border" data-detail-trigger="matrix"><OverviewDemoAttentionChart points={matrix.points} averageScore={matrix.averageScore} deltaRange={matrix.deltaRange} onSelect={onSelect} /></div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Y：下降 → 改善</span><span>平均分 {matrix.averageScore ?? "—"}</span><span>X：低分 → 高分</span></div>
        </div>
        <aside className="rounded-xl bg-muted/35 p-3" data-testid="priority-scope-list">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">重点关注</p>
          <div className="mt-2 divide-y">
            {matrix.priorityScopes.map((scope) => <button key={scope.id} type="button" onClick={() => onSelect(scope.id)} className="grid w-full grid-cols-[1fr_auto] gap-2 py-2.5 text-left hover:text-primary"><span className="min-w-0"><span className="block truncate text-sm font-medium">{scope.label}</span><span className="block truncate text-[11px] text-muted-foreground">{scope.topHint}</span></span><span className="text-right"><strong className="block text-sm tabular-nums">{scope.score ?? "—"}</strong><span className={scope.delta !== null && scope.delta < 0 ? "text-[11px] text-red-700" : "text-[11px] text-emerald-700"}>{scope.delta !== null && scope.delta > 0 ? "+" : ""}{scope.delta ?? "—"}</span></span></button>)}
          </div>
        </aside>
      </CardContent>
    </Card>
  )
}
