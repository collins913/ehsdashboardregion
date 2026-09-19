import { ArrowDownRight, ArrowUpRight, CircleAlert, Database, Focus, RefreshCcw, Store, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { OverviewDemoExecutiveInsight, OverviewDemoHistoryPoint, OverviewDemoManagementSignal } from "../model/overview-demo-types"
import { OverviewDemoTrendChart } from "./overview-demo-charts"

function Delta({ value }: { value: number | null }) {
  const Icon = (value ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight
  return <span className={value === null ? "text-muted-foreground" : value >= 0 ? "text-emerald-700" : "text-red-700"}><Icon className="mr-1 inline size-4" />{value === null ? "不可比" : `${value > 0 ? "+" : ""}${value}`}</span>
}

function MiniTrend({ history }: { history: readonly OverviewDemoHistoryPoint[] }) {
  return <div className="mt-2 flex items-end gap-3" data-testid="executive-trend"><OverviewDemoTrendChart history={history} compact /><span className="pb-1 text-[11px] text-muted-foreground">4 periods</span></div>
}

function Signal({ signal, icon: Icon }: { signal: OverviewDemoManagementSignal; icon: typeof Focus }) {
  return <div className="min-w-0 border-l border-primary/15 pl-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"><Icon className="size-3.5 text-primary" />{signal.label}</p><p className="mt-1 truncate text-sm font-semibold" title={signal.value}>{signal.value}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{signal.detail}</p></div>
}

export function ManagementSummary({ insight, history }: { insight: OverviewDemoExecutiveInsight; history: readonly OverviewDemoHistoryPoint[] }) {
  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-muted/50 py-0 shadow-none">
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[0.55fr_1.45fr] lg:items-center lg:p-6">
        <div className="border-b border-primary/10 pb-4 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
          <div className="flex items-center gap-2 text-xs font-medium text-primary"><Focus className="size-4" />Executive overview</div>
          <div className="mt-2 flex items-end gap-2"><strong className="text-6xl tracking-[-0.07em] tabular-nums">{insight.overallScore ?? "—"}</strong><span className="pb-1.5 text-xs text-muted-foreground">/ 100</span></div>
          <MiniTrend history={history} />
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]"><Badge variant="outline" className="bg-background/70"><Delta value={insight.delta} /></Badge><Badge variant="outline" className="bg-background/70"><Database />{insight.completeness}%</Badge><Badge variant="outline" className="bg-background/70"><Store />{insight.storeCount}</Badge></div>
        </div>
        <div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="management-signals"><Signal signal={insight.priorityScope} icon={Focus} /><Signal signal={insight.declineSignal} icon={TrendingDown} /><Signal signal={insight.systemicSignal} icon={CircleAlert} /><Signal signal={insight.improvementSignal} icon={RefreshCcw} /></div>
          <p className="mt-4 border-t border-primary/10 pt-3 text-sm leading-6 text-foreground/80" data-testid="executive-note">{insight.note}</p>
        </div>
      </CardContent>
    </Card>
  )
}
