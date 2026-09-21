import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OverviewDemoIssueView } from "../model/overview-demo-types"
import { OverviewDemoLifecycleChart } from "./overview-demo-charts"
import { LifecycleLegend } from "./lifecycle-legend"

export function IssueProfile({
  issues,
  onSelect,
}: {
  issues: readonly OverviewDemoIssueView[]
  onSelect: (issue: OverviewDemoIssueView) => void
}) {
  return (
    <Card className="gap-4 py-5 shadow-none" data-testid="issue-intelligence">
      <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 px-5 sm:px-6">
        <div><CardTitle className="text-lg tracking-tight">问题洞察</CardTitle><CardDescription>查看当前影响范围、问题变化及小区集中度；集中度仅用于 Demo 管理观察。</CardDescription></div>
        <LifecycleLegend />
      </CardHeader>
      <CardContent className="grid gap-2 px-5 md:grid-cols-2 sm:px-6 xl:grid-cols-4">
        {issues.map((issue) => (
          <button
            key={issue.id}
            type="button"
            data-detail-trigger="issue"
            onClick={() => onSelect(issue)}
            className="group rounded-xl border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-medium">{issue.label}</p><ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
            <div className="mt-4 flex items-end gap-2"><strong className="text-3xl tabular-nums">{issue.currentCount}</strong><span className="pb-1 text-xs text-muted-foreground">家门店</span><span className={issue.delta > 0 ? "ml-auto pb-1 text-xs text-red-700" : issue.delta < 0 ? "ml-auto pb-1 text-xs text-emerald-700" : "ml-auto pb-1 text-xs text-muted-foreground"}>{issue.delta > 0 ? "+" : ""}{issue.delta} 较上期</span></div>
            <OverviewDemoLifecycleChart lifecycle={issue.lifecycle} />
            <div className="flex justify-between text-[11px]"><span className="text-amber-700">持续率 {issue.persistenceRate ?? "—"}%</span><span className="text-emerald-700">已恢复 {issue.recoveredCount}</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{issue.affectedAreaCount}/{issue.totalAreaCount} 个小区 · 最高小区占比 {issue.topAreaShare}%</p>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
