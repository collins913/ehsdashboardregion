import { ArrowDownRight, ArrowUpRight, Focus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { OverviewDemoHero, OverviewDemoHeroScopeChange } from "../model/overview-demo-types"
import { OverviewDemoMonthlyTrendChart } from "./overview-demo-charts"

function Delta({ value }: { value: number | null }) {
  const Icon = (value ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight
  return <span className={value === null ? "text-muted-foreground" : value >= 0 ? "text-emerald-700" : "text-red-700"}><Icon className="mr-1 inline size-4" />{value === null ? "不可比较" : `${value > 0 ? "+" : ""}${value} 较上月`}</span>
}

function ScopeChange({ label, value }: { label: string; value: OverviewDemoHeroScopeChange }) {
  return <div className="flex min-w-0 items-baseline gap-2"><span className="shrink-0 text-xs text-muted-foreground">{label}</span><strong className="truncate text-sm font-medium" title={value?.name}>{value?.name ?? "暂无"}</strong><span className="ml-auto shrink-0 text-sm font-semibold tabular-nums">{value ? `${value.delta > 0 ? "+" : ""}${value.delta}` : "—"}</span></div>
}

function ChangeTrack({ label, area, store, improving }: { label: string; area: OverviewDemoHeroScopeChange; store: OverviewDemoHeroScopeChange; improving: boolean }) {
  return <div className={`grid gap-2 border-l-2 py-1 pl-3 sm:grid-cols-[5.5rem_1fr_1fr] sm:items-center ${improving ? "border-emerald-500 text-emerald-700" : "border-red-500 text-red-700"}`} data-change-track={improving ? "improving" : "declining"}>
    <span className="text-xs font-semibold">{label}</span><ScopeChange label="小区" value={area} /><ScopeChange label="门店" value={store} />
  </div>
}

export function ManagementSummary({ hero }: { hero: OverviewDemoHero }) {
  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-muted/50 py-0 shadow-none" data-testid="management-summary">
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[0.65fr_1.35fr] lg:gap-5 lg:px-5 lg:py-4">
        <div className="border-b border-primary/10 pb-3 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
          <div className="flex items-center gap-2 text-xs font-medium text-primary"><Focus className="size-4" />管理总览</div>
          <div className="mt-1 flex items-end gap-2"><strong className="text-5xl tracking-[-0.06em] tabular-nums">{hero.overallScore ?? "—"}</strong><span className="pb-1 text-xs text-muted-foreground">/ 100 综合得分</span></div>
          <div className="mt-1 text-xs"><Delta value={hero.monthlyDelta} /></div>
          <OverviewDemoMonthlyTrendChart history={hero.monthlyScoreHistory} />
        </div>
        <div className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold">本月变化</h2>
          <ChangeTrack label="改善最多" area={hero.topImprovingArea} store={hero.topImprovingStore} improving />
          <ChangeTrack label="退步最多" area={hero.topDecliningArea} store={hero.topDecliningStore} improving={false} />
          <div className="grid gap-3 border-t border-primary/10 pt-3 sm:grid-cols-2">
            <div data-hero-block="primary-score-loss"><p className="text-xs font-semibold text-muted-foreground">主要失分</p><p className="mt-1 text-sm font-medium">{hero.primaryScoreLoss?.label ?? "当前无失分项"}</p><p className="text-xs text-muted-foreground">{hero.primaryScoreLoss ? `${hero.primaryScoreLoss.affectedStores} 家门店` : "—"}</p></div>
            <div data-hero-block="systemic-issue"><p className="text-xs font-semibold text-muted-foreground">系统性问题</p><p className="mt-1 text-sm font-medium">{hero.systemicIssue?.label ?? "当前无跨小区问题"}</p><p className="text-xs text-muted-foreground">{hero.systemicIssue ? `${hero.systemicIssue.affectedAreas} / ${hero.systemicIssue.totalAreas} 个小区 · ${hero.systemicIssue.affectedStores} 家门店` : "—"}</p></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
