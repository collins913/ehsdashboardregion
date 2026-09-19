import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OverviewDemoScopeComparison } from "../model/overview-demo-types"

function deltaLabel(delta: number | null) {
  if (delta === null) return "—"
  return `${delta > 0 ? "+" : ""}${delta}`
}

export function ScopeComparison({
  title,
  comparisons,
  onSelect,
}: {
  title: string
  comparisons: readonly OverviewDemoScopeComparison[]
  onSelect: (id: string) => void
}) {
  return (
    <Card className="gap-4 py-5 shadow-none">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
        <CardDescription>展示头部与尾部范围；点击打开完整诊断、四期趋势与基准。</CardDescription>
      </CardHeader>
      <CardContent className="px-5 sm:px-6">
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[2rem_minmax(8rem,1fr)_4rem_4rem_minmax(10rem,1.1fr)_minmax(9rem,1fr)_1rem] gap-3 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"><span>Rank</span><span>Scope</span><span className="text-right">Score</span><span className="text-right">Delta</span><span>Top driver</span><span>Concern</span><span /></div>
          {comparisons.map((scope) => (
            <button
              key={scope.id}
              type="button"
              data-detail-trigger="scope"
              className="group grid w-full grid-cols-[2rem_minmax(8rem,1fr)_4rem_4rem_minmax(10rem,1.1fr)_minmax(9rem,1fr)_1rem] items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => onSelect(scope.id)}
            >
              <span className="text-xs tabular-nums text-muted-foreground">{scope.rank ?? "—"}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{scope.label}</span>{scope.completeness < 100 ? <span className="text-[10px] text-amber-700">{scope.completeness}% complete</span> : null}</span>
              <span className="text-right text-sm font-semibold tabular-nums">{scope.score ?? "—"}</span>
              <span className={scope.delta === null ? "text-right text-xs text-muted-foreground" : scope.delta >= 0 ? "text-right text-xs text-emerald-700" : "text-right text-xs text-red-700"}>{deltaLabel(scope.delta)}</span>
              <span className="truncate text-xs text-muted-foreground">{scope.topHint}</span>
              <span className="truncate text-xs text-muted-foreground">{scope.topIssue ?? "无当前重点问题"}</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
          {comparisons.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">当前范围无下级比较对象。</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
