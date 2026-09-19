"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CheckCircle2, Database, ListChecks, PlusCircle, Repeat2, Store } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { OverviewDemoDriverView, OverviewDemoIssueView, OverviewDemoScopeDetail } from "../model/overview-demo-types"
import { OverviewDemoAreaDistributionChart, OverviewDemoBenchmarkChart, OverviewDemoLifecycleChart, OverviewDemoTrendChart } from "./overview-demo-charts"

export type OverviewDemoSheetDetail = { kind: "scope"; value: OverviewDemoScopeDetail } | { kind: "issue"; value: OverviewDemoIssueView }

function deltaLabel(delta: number | null) {
  if (delta === null) return "—"
  return `${delta > 0 ? "+" : ""}${delta}`
}

function ChangeLane({ title, items, icon: Icon, tone }: { title: string; items: readonly OverviewDemoDriverView[]; icon: typeof PlusCircle; tone: "red" | "amber" | "green" }) {
  const color = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-emerald-700"
  return <div><h4 className={`flex items-center gap-1.5 text-xs font-semibold ${color}`}><Icon className="size-3.5" />{title}</h4><div className="mt-2 space-y-1.5">{items.slice(0, 3).map((item) => <p key={item.label} className="flex justify-between gap-2 text-xs"><span className="truncate">{item.label}</span><span className="shrink-0 text-muted-foreground">{item.affectedCount}</span></p>)}{items.length === 0 ? <p className="text-xs text-muted-foreground">无</p> : null}</div></div>
}

function TrendFigure({ detail }: { detail: OverviewDemoScopeDetail }) {
  return <section className="rounded-xl border bg-muted/20 p-4" data-testid="scope-sparkline"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">4-period trend</h3><span className="text-xs text-muted-foreground">Q3 2025 — Q2 2026</span></div><div className="mt-2"><OverviewDemoTrendChart history={detail.history} /></div></section>
}

export function ScopeSheet({ detail }: { detail: OverviewDemoScopeDetail }) {
  return <>
    <SheetHeader className="border-b px-5 py-5"><div className="mb-2 flex items-center gap-2"><Badge variant="secondary">{detail.level === "AREA" ? "小区" : "门店"}</Badge><span className="text-xs text-muted-foreground">Enhanced diagnosis</span></div><SheetTitle className="text-xl">{detail.label}</SheetTitle><SheetDescription>{detail.conclusion}</SheetDescription></SheetHeader>
    <div className="space-y-6 px-5 pb-6">
      <section data-testid="scope-benchmark"><div className="grid grid-cols-3 gap-2"><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Current</p><p className="mt-1 text-xl font-semibold">{detail.score ?? "—"}</p></div><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Delta</p><p className={detail.delta !== null && detail.delta < 0 ? "mt-1 text-xl font-semibold text-red-700" : "mt-1 text-xl font-semibold text-emerald-700"}>{deltaLabel(detail.delta)}</p></div><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Rank</p><p className="mt-1 text-xl font-semibold">{detail.benchmark.rank ? `${detail.benchmark.rank}/${detail.benchmark.total}` : "—"}</p></div></div><div className="mt-2 rounded-lg border"><OverviewDemoBenchmarkChart current={detail.score} benchmark={detail.benchmark} /></div></section>
      <TrendFigure detail={detail} />
      <section data-testid="priority-investigation"><h3 className="text-sm font-semibold">Priority Investigation</h3><p className="mt-1 text-xs text-muted-foreground">按持续与新增问题、下降驱动及影响门店数确定性排序，不是风险评分。</p><div className="mt-3 divide-y rounded-lg border">{detail.priorityInvestigations.slice(0, 3).map((item, index) => <Link key={item.issueKey} href={item.routeTarget} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 hover:bg-muted/50"><span className="text-xs font-semibold text-muted-foreground">{index + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{item.label}</span><span className="block truncate text-xs text-muted-foreground">{item.dimension} · {item.reason}</span></span><span className="text-right text-xs"><strong className="block text-sm">{item.affectedStores}</strong><span className="text-muted-foreground">stores</span></span></Link>)}</div></section>
      <section><h3 className="text-sm font-semibold">Dimension diagnosis</h3><div className="mt-3 divide-y rounded-lg border">{detail.dimensions.map((dimension) => <div key={dimension.id} className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-2 px-3 py-2.5 text-sm"><span><span className="font-medium">{dimension.label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{dimension.primaryDrag}</span></span><span className="text-right font-medium tabular-nums">{dimension.score ?? "TBD"}</span><span className="text-right text-xs tabular-nums text-muted-foreground">{deltaLabel(dimension.delta)}</span></div>)}</div></section>
      <section data-testid="scope-what-changed"><h3 className="text-sm font-semibold">What Changed</h3><div className="mt-3 grid gap-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-3"><ChangeLane title="New" items={detail.changeSummary.newIssues} icon={PlusCircle} tone="red" /><ChangeLane title="Persistent" items={detail.changeSummary.persistentIssues} icon={Repeat2} tone="amber" /><ChangeLane title="Recovered" items={detail.changeSummary.recovered} icon={CheckCircle2} tone="green" /></div></section>
      <section><h3 className="text-sm font-semibold">Management facts</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center">{detail.facts.map((fact, index) => { const Icon = index === 0 ? ListChecks : index === 1 ? Store : Database; return <div key={fact} className="border p-3"><Icon className="mx-auto size-4 text-muted-foreground" /><p className="mt-2 text-xs leading-5">{fact}</p></div> })}</div></section>
      <Separator />
      <div className="flex flex-wrap gap-2"><Button asChild><Link href="/performance/kpi">KPI<ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/risk/actions">Actions</Link></Button><Button asChild variant="outline"><Link href="/risk/events">Events</Link></Button><Button asChild variant="outline"><Link href="/risk/certificates">Certificates</Link></Button><Button asChild variant="outline"><Link href="/risk/environment">Environment</Link></Button></div>
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
    <SheetHeader className="border-b px-5 py-5"><Badge variant="outline" className="mb-2">Issue intelligence</Badge><SheetTitle className="text-xl">{issue.label}</SheetTitle><SheetDescription>当前问题的生命周期、分布与集中度分析。</SheetDescription></SheetHeader>
    <div className="space-y-6 px-5 pb-6">
      <div className="grid grid-cols-3 gap-2 text-center"><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Current</p><p className="mt-1 text-xl font-semibold">{issue.currentCount}</p></div><div className="bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Delta</p><p className="mt-1 text-xl font-semibold">{issue.delta > 0 ? "+" : ""}{issue.delta}</p></div><div className="bg-amber-50 p-3 dark:bg-amber-950/20"><p className="text-xs text-amber-700">Persistence</p><p className="mt-1 text-xl font-semibold">{issue.persistenceRate ?? "—"}%</p></div></div>
      <section data-testid="issue-lifecycle"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Lifecycle</h3><span className="text-xs text-muted-foreground">New {issue.newIssueCount} · Persistent {issue.persistentIssueCount} · Recovered {issue.recoveredCount}</span></div><OverviewDemoLifecycleChart current={issue.currentCount} newCount={issue.newIssueCount} persistentCount={issue.persistentIssueCount} /></section>
      <section data-testid="issue-area-distribution"><h3 className="text-sm font-semibold">Area distribution</h3><div className="mt-3"><OverviewDemoAreaDistributionChart data={issue.areaDistribution} /></div></section>
      <section><h3 className="text-sm font-semibold">Concentration</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="border p-3"><strong className="text-lg tabular-nums">{issue.topAreaShare}%</strong><p className="text-xs text-muted-foreground">Top Area</p></div><div className="border p-3"><strong className="text-lg tabular-nums">{issue.top2AreaShare}%</strong><p className="text-xs text-muted-foreground">Top 2</p></div><div className="border p-3"><strong className="text-lg tabular-nums">{issue.top3AreaShare}%</strong><p className="text-xs text-muted-foreground">Top 3</p></div></div></section>
      <section className="border-l-2 border-primary pl-3" data-testid="issue-conclusion"><h3 className="text-sm font-semibold">Conclusion</h3><p className="mt-1 text-sm text-muted-foreground">{issue.conclusion}</p></section>
      <section data-testid="issue-store-list"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Affected stores</h3><Select value={area} onValueChange={(value) => { setArea(value); setLimit(40) }}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Areas</SelectItem>{areas.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><Command shouldFilter={false} className="mt-3 border"><CommandInput placeholder="搜索门店、TRTID 或小区" value={query} onValueChange={(value) => { setQuery(value); setLimit(40) }} /><CommandList className="max-h-72"><CommandEmpty>没有匹配门店。</CommandEmpty>{visible.map((store) => <CommandItem key={store.storeId} value={`${store.storeLabel}-${store.storeId}`}><span className="min-w-0 flex-1 truncate">{store.storeLabel}</span><span className="text-xs text-muted-foreground">{store.storeId} · {store.area}</span></CommandItem>)}</CommandList></Command>{visible.length < filtered.length ? <Button variant="outline" className="mt-3 w-full" onClick={() => setLimit((value) => value + 40)}>显示更多（{visible.length}/{filtered.length}）</Button> : <p className="mt-2 text-center text-xs text-muted-foreground">已显示 {filtered.length} 家门店</p>}</section>
      <Button asChild><Link href={issue.route}>进入业务页面<ArrowRight /></Link></Button>
    </div>
  </>
}

export function ScopeDetailSheet({ detail, onClose }: { detail: OverviewDemoSheetDetail | null; onClose: () => void }) {
  return <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) onClose() }}><SheetContent className="overflow-y-auto sm:max-w-2xl!">{detail?.kind === "scope" ? <ScopeSheet detail={detail.value} /> : detail?.kind === "issue" ? <IssueSheet issue={detail.value} /> : null}</SheetContent></Sheet>
}
