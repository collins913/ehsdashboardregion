import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OverviewDemoIssueView } from "../model/overview-demo-types"
import { OverviewDemoLifecycleChart } from "./overview-demo-charts"

export function IssueProfile({
  issues,
  onSelect,
}: {
  issues: readonly OverviewDemoIssueView[]
  onSelect: (issue: OverviewDemoIssueView) => void
}) {
  return (
    <Card className="gap-4 py-5 shadow-none" data-testid="issue-intelligence">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="text-lg tracking-tight">Issue Intelligence</CardTitle>
        <CardDescription>当前规模、生命周期与区域集中度；集中度仅为 Demo 管理展示。</CardDescription>
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
            <div className="mt-4 flex items-end gap-2"><strong className="text-3xl tabular-nums">{issue.currentCount}</strong><span className="pb-1 text-xs text-muted-foreground">stores</span><span className={issue.delta > 0 ? "ml-auto pb-1 text-xs text-red-700" : issue.delta < 0 ? "ml-auto pb-1 text-xs text-emerald-700" : "ml-auto pb-1 text-xs text-muted-foreground"}>{issue.delta > 0 ? "+" : ""}{issue.delta} vs prev</span></div>
            <OverviewDemoLifecycleChart current={issue.currentCount} newCount={issue.newIssueCount} persistentCount={issue.persistentIssueCount} />
            <div className="flex justify-between text-[11px]"><span className="text-amber-700">Persistence {issue.persistenceRate ?? "—"}%</span><span className="text-emerald-700">Recovered {issue.recoveredCount}</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{issue.affectedAreaCount}/{issue.totalAreaCount} Areas · Top Area {issue.topAreaShare}%</p>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
