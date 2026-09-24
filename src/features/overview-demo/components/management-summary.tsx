"use client"

import { useState, type ReactNode } from "react"
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, Building2, ChevronRight, Focus, Store } from "lucide-react"
import { OverflowTooltip } from "@/components/shared/overflow-tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { OverviewDemoHero, OverviewDemoHeroScopeChange, OverviewDemoIssueView, OverviewDemoMovementDetail, OverviewDemoMovementScope, OverviewDemoScoreChange } from "../model/overview-demo-types"
import { DetailDelta } from "./detail-delta"
import { OverviewDemoMonthlyTrendChart } from "./overview-demo-charts"

function Delta({ value }: { value: number | null }) {
  const Icon = (value ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight
  return <span className={value === null ? "text-muted-foreground" : value >= 0 ? "text-emerald-700" : "text-red-700"}><Icon className="mr-1 inline size-4" />{value === null ? "不可比较" : `${value > 0 ? "+" : ""}${value} 较上月`}</span>
}

function ScopeChange({ label, value, type }: { label: string; value: OverviewDemoHeroScopeChange; type: "improving" | "declining" }) {
  const Icon = label === "小区" ? Building2 : Store
  return <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2.5">
    <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <OverflowTooltip text={value?.name ?? "暂无"} className="text-sm font-medium text-foreground" focusable={false} />
    <span className={`text-right text-sm font-semibold tabular-nums ${value ? type === "improving" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>{value ? `${value.delta > 0 ? "+" : ""}${value.delta}` : "—"}</span>
  </div>
}

function HeroPanel({ title, onClick, children, type, block }: { title: ReactNode; onClick: () => void; children: ReactNode; type?: "improving" | "declining"; block?: "primary-score-loss" | "systemic-issue" }) {
  return <button type="button" aria-label={`查看${type === "improving" ? "改善最多" : type === "declining" ? "退步最多" : block === "primary-score-loss" ? "主要失分" : "系统性问题"}详情`} onClick={onClick} data-change-track={type} data-hero-block={block} className="group min-w-0 rounded-lg border bg-card p-3 text-left transition-colors cursor-pointer hover:border-foreground/20 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
    <div className="flex items-start justify-between gap-2"><span className="min-w-0">{title}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" aria-hidden="true" /></div>
    {children}
  </button>
}

function MovementCard({ type, area, store, onClick }: { type: "improving" | "declining"; area: OverviewDemoHeroScopeChange; store: OverviewDemoHeroScopeChange; onClick: () => void }) {
  const improving = type === "improving"
  const Icon = improving ? ArrowUp : ArrowDown
  return <HeroPanel type={type} onClick={onClick} title={<span className={`flex items-center gap-1.5 text-xs font-semibold ${improving ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}><Icon className="size-3.5" />{improving ? "改善最多" : "退步最多"}</span>}>
    <div className="mt-3 space-y-2">
      <ScopeChange label="小区" value={area} type={type} />
      <ScopeChange label="门店" value={store} type={type} />
    </div>
  </HeroPanel>
}

function ScoreChangeList({ changes, unavailable }: { changes: readonly OverviewDemoScoreChange[]; unavailable: boolean }) {
  return <div className="mt-2 space-y-2 rounded-md bg-muted/30 px-3 py-2.5">
    {changes.map((change) => <div key={change.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm"><span className="min-w-0 truncate">{change.label}</span><span className="shrink-0 font-medium"><DetailDelta value={change.deltaPoints} /></span></div>)}
    {changes.length === 0 ? <p className="text-xs text-muted-foreground">{unavailable ? "评分项变化暂不可比较" : "本月无评分项变化"}</p> : null}
  </div>
}

function MovementDetailSection({ label, scope }: { label: "小区" | "门店"; scope: OverviewDemoMovementScope | null }) {
  const Icon = label === "小区" ? Building2 : Store
  return <section className="rounded-lg border bg-card p-4">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
      <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</p><h3 className="mt-1 min-w-0 text-base font-semibold"><OverflowTooltip text={scope?.name ?? "暂无"} focusable={false} /></h3></div>
      <p className="shrink-0 text-right text-sm font-semibold"><DetailDelta value={scope?.delta ?? null} /> <span className="text-xs font-normal text-muted-foreground">较上月</span></p>
    </div>
    <p className="mt-3 text-sm"><span className="text-muted-foreground">当前得分</span> <strong className="ml-2 tabular-nums text-foreground">{scope?.currentScore ?? "—"}</strong></p>
    <h4 className="mt-4 text-xs font-semibold text-muted-foreground">变化明细</h4>
    <ScoreChangeList changes={scope?.scoreChanges ?? []} unavailable={scope?.scoreChangesUnavailable ?? false} />
  </section>
}

export function ManagementSummary({ hero, movements, issues, onSelectIssue }: { hero: OverviewDemoHero; movements: { improving: OverviewDemoMovementDetail; declining: OverviewDemoMovementDetail }; issues: readonly OverviewDemoIssueView[]; onSelectIssue: (issue: OverviewDemoIssueView) => void }) {
  const [activeMovement, setActiveMovement] = useState<"improving" | "declining" | null>(null)
  const [fallbackIssue, setFallbackIssue] = useState<"primary-score-loss" | "systemic-issue" | null>(null)
  const movement = activeMovement === "improving" ? movements.improving : movements.declining
  function openIssue(label: string | undefined, fallback: "primary-score-loss" | "systemic-issue") {
    const issue = issues.find((item) => item.label === label)
    if (issue) onSelectIssue(issue)
    else setFallbackIssue(fallback)
  }
  return (
    <>
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-muted/50 py-0 shadow-none" data-testid="management-summary">
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[0.65fr_1.35fr] lg:gap-5 lg:px-5 lg:py-4">
        <div className="border-b border-primary/10 pb-3 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
          <div className="flex items-center gap-2 text-xs font-medium text-primary"><Focus className="size-4" />管理总览</div>
          <div className="mt-1 flex items-end gap-2"><strong className="text-5xl tracking-[-0.06em] tabular-nums">{hero.overallScore ?? "—"}</strong><span className="pb-1 text-xs text-muted-foreground">/ 100 综合得分</span></div>
          <div className="mt-1 text-xs"><Delta value={hero.monthlyDelta} /></div>
          <OverviewDemoMonthlyTrendChart history={hero.monthlyScoreHistory} />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <MovementCard type="improving" area={hero.topImprovingArea} store={hero.topImprovingStore} onClick={() => setActiveMovement("improving")} />
          <MovementCard type="declining" area={hero.topDecliningArea} store={hero.topDecliningStore} onClick={() => setActiveMovement("declining")} />
          <HeroPanel block="primary-score-loss" onClick={() => openIssue(hero.primaryScoreLoss?.label, "primary-score-loss")} title={<span className="text-xs font-semibold text-muted-foreground">主要失分</span>}><p className="mt-2 text-sm font-semibold text-foreground">{hero.primaryScoreLoss?.label ?? "当前无失分项"}</p><p className="mt-1 text-sm tabular-nums text-foreground">{hero.primaryScoreLoss ? `${hero.primaryScoreLoss.affectedStores} 家门店未得分` : "—"}</p></HeroPanel>
          <HeroPanel block="systemic-issue" onClick={() => openIssue(hero.systemicIssue?.label, "systemic-issue")} title={<span className="text-xs font-semibold text-muted-foreground">系统性问题</span>}><p className="mt-2 text-sm font-semibold text-foreground">{hero.systemicIssue?.label ?? "当前无跨小区问题"}</p><p className="mt-1 text-sm tabular-nums text-foreground">{hero.systemicIssue ? `${hero.systemicIssue.affectedAreas} / ${hero.systemicIssue.totalAreas} 个小区 · ${hero.systemicIssue.affectedStores} 家门店` : "—"}</p></HeroPanel>
        </div>
      </CardContent>
    </Card>
    <Sheet open={activeMovement !== null} onOpenChange={(open) => { if (!open) setActiveMovement(null) }}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>{activeMovement === "improving" ? "改善最多" : "退步最多"}</SheetTitle><SheetDescription className="sr-only">小区与门店变化明细</SheetDescription></SheetHeader><div className="space-y-5 px-4 pb-4"><MovementDetailSection label="小区" scope={movement.area} /><MovementDetailSection label="门店" scope={movement.store} /></div></SheetContent></Sheet>
    <Sheet open={fallbackIssue !== null} onOpenChange={(open) => { if (!open) setFallbackIssue(null) }}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>{fallbackIssue === "primary-score-loss" ? "主要失分" : "系统性问题"}</SheetTitle><SheetDescription>当前范围的概要信息；该问题未包含在下方问题洞察列表。</SheetDescription></SheetHeader><div className="px-4 text-sm"><p className="font-semibold">{fallbackIssue === "primary-score-loss" ? hero.primaryScoreLoss?.label ?? "当前无失分项" : hero.systemicIssue?.label ?? "当前无跨小区问题"}</p><p className="mt-2 text-muted-foreground">{fallbackIssue === "primary-score-loss" ? hero.primaryScoreLoss ? `${hero.primaryScoreLoss.affectedStores} 家门店未得分` : "—" : hero.systemicIssue ? `${hero.systemicIssue.affectedAreas} / ${hero.systemicIssue.totalAreas} 个小区 · ${hero.systemicIssue.affectedStores} 家门店` : "—"}</p></div></SheetContent></Sheet>
    </>
  )
}
