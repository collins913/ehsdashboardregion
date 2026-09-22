"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { OverviewDemoDriverView, OverviewDemoIssueView, OverviewDemoScopeDetail } from "../model/overview-demo-types"
import { OverviewDemoAreaDistributionChart, OverviewDemoLifecycleChart, OverviewDemoMonthlyTrendChart } from "./overview-demo-charts"
import { DetailDelta } from "./detail-delta"

export type OverviewDemoSheetDetail = { kind: "scope"; value: OverviewDemoScopeDetail } | { kind: "issue"; value: OverviewDemoIssueView }

function deltaLabel(delta: number | null) {
  if (delta === null) return "—"
  return `${delta > 0 ? "+" : ""}${delta}`
}

function ChangeLane({ title, items }: { title: string; items: readonly OverviewDemoDriverView[] }) {
  return <div className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)]"><p className="text-xs font-semibold">{title} <span className="text-muted-foreground">{items.length}</span></p><div className="flex flex-wrap gap-1.5">{items.map((item) => <Badge key={item.categoryKey} variant="outline" className="font-normal">{item.categoryLabel}<span className="text-muted-foreground">{item.status} · {item.affectedCount} 家</span></Badge>)}{items.length === 0 ? <span className="text-xs text-muted-foreground">无</span> : null}</div></div>
}

function TrendFigure({ detail }: { detail: OverviewDemoScopeDetail }) {
  return <section className="border-y py-3" data-testid="scope-sparkline"><div className="flex justify-end"><Badge variant="secondary">{detail.trendLabel}</Badge></div><OverviewDemoMonthlyTrendChart history={detail.monthlyHistory} showSparseTicks /></section>
}

export function ScopeSheet({ detail }: { detail: OverviewDemoScopeDetail }) {
  const [changeMode, setChangeMode] = useState<"DECLINING" | "IMPROVING">("DECLINING")
  useEffect(() => { setChangeMode("DECLINING") }, [detail.id])
  const benchmarkLabel = detail.level === "REGION" ? "整体平均" : detail.level === "AREA" ? "区域平均" : "小区平均"
  const changes = changeMode === "DECLINING" ? detail.scopeChanges?.declining ?? [] : detail.scopeChanges?.improving ?? []
  return <>
    <SheetHeader className="border-b px-5 py-4"><SheetTitle className="text-xl">综合诊断</SheetTitle><SheetDescription className="sr-only">{detail.label}的综合诊断</SheetDescription><div className="pt-2"><span className="text-xs text-muted-foreground">{detail.level === "REGION" ? "区域" : detail.level === "AREA" ? "小区" : "门店"}</span><p className="mt-0.5 text-base font-semibold">{detail.label}</p></div></SheetHeader>
    <div className="space-y-4 px-5 pb-5">
      <section className="pt-1" data-testid="scope-benchmark"><p className="text-4xl font-semibold tracking-tight tabular-nums">{detail.score ?? "—"}</p><p className="text-xs text-muted-foreground">综合得分</p><div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-sm"><div><p className="text-xs text-muted-foreground">较上月</p><p className="mt-1 font-semibold"><DetailDelta value={detail.monthlyDelta} /></p></div><div><p className="text-xs text-muted-foreground">排名</p><p className="mt-1 font-semibold">{detail.benchmark.rankLabel}</p></div><div><p className="text-xs text-muted-foreground">{benchmarkLabel}</p><p className="mt-1 font-semibold tabular-nums">{detail.benchmark.parentAverage ?? "—"}</p></div><div><p className="text-xs text-muted-foreground">数据完整度</p><p className="mt-1 font-semibold tabular-nums">{detail.completeness}%</p></div></div></section>
      <TrendFigure detail={detail} />
      <section data-testid="scope-diagnostics"><h3 className="text-sm font-semibold">重点诊断</h3><div className="mt-2 divide-y border-y">{detail.diagnostics.map((dimension) => <div key={dimension.dimensionKey} className="py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{dimension.dimensionLabel}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{dimension.score ?? "TBD"} <span className="ml-2 text-xs font-normal"><DetailDelta value={dimension.delta} /></span></span></div>{dimension.issues.length > 0 ? <div className="mt-2 divide-y rounded-md border px-3">{dimension.issues.map((issue) => <div key={issue.categoryKey} className="py-2"><p className="text-sm font-medium">{issue.categoryLabel}</p><div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs"><span className="text-muted-foreground">当前状态 <span className="ml-1 text-foreground">{issue.status}</span></span><span className="text-right text-muted-foreground">得分变化 <DetailDelta value={issue.scoreImpact} /></span><span className="col-span-2 text-muted-foreground">影响门店 {issue.affectedStores} 家</span></div></div>)}</div> : <p className="mt-2 text-xs text-muted-foreground">{dimension.dimensionKey === "ENVIRONMENT" ? "评分方式待定义" : "当前无重点问题"}</p>}</div>)}</div></section>
      <section data-testid="scope-what-changed"><h3 className="text-sm font-semibold">本期变化</h3><div className="mt-2 space-y-2"><ChangeLane title="本期新增" items={detail.changeSummary.newIssues} /><ChangeLane title="持续存在" items={detail.changeSummary.persistentIssues} /><ChangeLane title="已改善" items={detail.changeSummary.recovered} /></div></section>
      {detail.scopeChanges ? <section data-testid="scope-changes"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{detail.scopeChanges.label}</h3><div className="flex gap-1"><Button size="xs" variant={changeMode === "DECLINING" ? "secondary" : "ghost"} aria-pressed={changeMode === "DECLINING"} onClick={() => setChangeMode("DECLINING")}>下降最多</Button><Button size="xs" variant={changeMode === "IMPROVING" ? "secondary" : "ghost"} aria-pressed={changeMode === "IMPROVING"} onClick={() => setChangeMode("IMPROVING")}>改善最多</Button></div></div><div className="mt-2 divide-y border-y">{changes.map((item) => <div key={item.scopeId} className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-2 py-2"><span className="min-w-0 truncate text-sm font-medium">{item.scopeName}</span><span className="text-right text-sm font-medium tabular-nums">{item.currentScore ?? "—"}</span><span className="text-right text-xs"><DetailDelta value={item.delta} /></span></div>)}{changes.length === 0 ? <p className="py-3 text-xs text-muted-foreground">无符合条件的变化。</p> : null}</div></section> : null}
      <section data-testid="management-facts"><h3 className="text-sm font-semibold">管理事实</h3><div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">{detail.managementFacts.map((fact, index) => <span key={fact.key} className="inline-flex items-center gap-1">{index > 0 ? <span className="text-muted-foreground">·</span> : null}<span className="text-muted-foreground">{fact.label}</span><strong className="tabular-nums">{fact.value}</strong></span>)}</div></section>
    </div>
  </>
}

export function IssueSheet({ issue }: { issue: OverviewDemoIssueView }) {
  const [area, setArea] = useState("ALL")
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(40)
  const areas = useMemo(() => issue.areaDistribution.map((item) => item.area), [issue.areaDistribution])
  useEffect(() => { setArea("ALL"); setQuery(""); setLimit(40) }, [issue.id])
  const filtered = issue.affectedStores.filter((store) => (area === "ALL" || store.area === area) && `${store.storeLabel} ${store.storeId} ${store.area}`.toLowerCase().includes(query.toLowerCase()))
  const visible = filtered.slice(0, limit)

  return <>
    <SheetHeader className="border-b px-5 py-5"><Badge variant="outline" className="mb-2">问题洞察</Badge><SheetTitle className="text-xl">{issue.label}</SheetTitle><SheetDescription>查看当前问题的变化、小区分布与集中度。</SheetDescription></SheetHeader>
    <div className="space-y-6 px-5 pb-6">
      <div className="grid grid-cols-3 gap-2 text-center"><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">当前</p><p className="mt-1 text-xl font-semibold">{issue.lifecycle.current}</p></div><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">较上期变化</p><p className="mt-1 text-xl font-semibold">{issue.lifecycle.delta > 0 ? "+" : ""}{issue.lifecycle.delta}</p></div><div className="bg-amber-50 p-3 dark:bg-amber-950/20"><p className="text-xs text-amber-700">持续率</p><p className="mt-1 text-xl font-semibold">{issue.persistenceRate ?? "—"}%</p></div></div>
      <section data-testid="issue-lifecycle"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">问题变化</h3><p className="mt-1 text-xs text-muted-foreground">当前 = 新增 + 持续；上期 = 持续 + 已恢复。</p></div><span className="text-xs text-muted-foreground">新增 {issue.lifecycle.new} · 持续 {issue.lifecycle.persistent} · 已恢复 {issue.lifecycle.recovered}</span></div><OverviewDemoLifecycleChart lifecycle={issue.lifecycle} /></section>
      <section data-testid="issue-area-distribution"><h3 className="text-sm font-semibold">小区分布</h3><div className="mt-3"><OverviewDemoAreaDistributionChart data={issue.areaDistribution} /></div></section>
      <section><h3 className="text-sm font-semibold">集中度</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="border p-3"><strong className="text-lg tabular-nums">{issue.topAreaShare}%</strong><p className="text-xs text-muted-foreground">最高小区占比</p></div><div className="border p-3"><strong className="text-lg tabular-nums">{issue.top2AreaShare}%</strong><p className="text-xs text-muted-foreground">前 2 个小区</p></div><div className="border p-3"><strong className="text-lg tabular-nums">{issue.top3AreaShare}%</strong><p className="text-xs text-muted-foreground">前 3 个小区</p></div></div></section>
      <section className="border-l-2 border-primary pl-3" data-testid="issue-conclusion"><h3 className="text-sm font-semibold">结论</h3><p className="mt-1 text-sm text-muted-foreground">{issue.conclusion}</p></section>
      <section data-testid="issue-store-list"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">受影响门店</h3><Select value={area} onValueChange={(value) => { setArea(value); setLimit(40) }}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部小区</SelectItem>{areas.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><Command shouldFilter={false} className="mt-3 border"><CommandInput placeholder="搜索门店、TRTID 或小区" value={query} onValueChange={(value) => { setQuery(value); setLimit(40) }} /><CommandList className="max-h-72"><CommandEmpty>没有匹配的门店。</CommandEmpty>{visible.map((store) => <CommandItem key={store.storeId} value={`${store.storeLabel}-${store.storeId}`}><span className="min-w-0 flex-1 truncate">{store.storeLabel}</span><span className="text-xs text-muted-foreground">{store.storeId} · {store.area}</span></CommandItem>)}</CommandList></Command>{visible.length < filtered.length ? <Button variant="outline" className="mt-3 w-full" onClick={() => setLimit((value) => value + 40)}>加载更多（{visible.length}/{filtered.length}）</Button> : <p className="mt-2 text-center text-xs text-muted-foreground">已显示全部 {filtered.length} 家门店</p>}</section>
      <Button asChild><Link href={issue.route}>进入业务页面<ArrowRight /></Link></Button>
    </div>
  </>
}

export function ScopeDetailSheet({ detail, onClose }: { detail: OverviewDemoSheetDetail | null; onClose: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }) }, [detail?.kind, detail?.value.id])
  return <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) onClose() }}><SheetContent ref={contentRef} className="overflow-y-auto sm:max-w-xl!">{detail?.kind === "scope" ? <ScopeSheet detail={detail.value} /> : detail?.kind === "issue" ? <IssueSheet issue={detail.value} /> : null}</SheetContent></Sheet>
}
