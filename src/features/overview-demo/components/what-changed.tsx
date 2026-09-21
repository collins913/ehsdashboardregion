import { CheckCircle2, PlusCircle, Repeat2 } from "lucide-react"
import type { OverviewDemoAttribution, OverviewDemoAttributionItem, OverviewDemoIssueView } from "../model/overview-demo-types"

function ChangeColumn({
  title,
  items,
  tone,
  issues,
}: {
  title: string
  items: readonly OverviewDemoAttributionItem[]
  tone: "red" | "amber" | "green"
  issues: readonly OverviewDemoIssueView[]
}) {
  const Icon = tone === "green" ? CheckCircle2 : tone === "red" ? PlusCircle : Repeat2
  const color = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-amber-700"
  return (
    <section className="min-w-0 border-t pt-4">
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${color}`}><Icon className="size-4" />{title}</h3>
      <div className="mt-3 space-y-3">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.metricKey}-${item.transition}`}>
            <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.label}</p><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.affectedStores.length} 家门店</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{item.affectedAreas.length} 个小区{tone === "amber" ? ` · 持续率 ${issues.find((issue) => issue.id === item.metricKey)?.persistenceRate ?? "—"}%` : ""}</p>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-muted-foreground">本期无对应变化。</p> : null}
      </div>
    </section>
  )
}

export function WhatChanged({ attribution, issues }: { attribution: OverviewDemoAttribution; issues: readonly OverviewDemoIssueView[] }) {
  return (
    <section className="rounded-xl border bg-muted/20 p-5 sm:p-6" data-testid="what-changed">
      <div><h2 className="text-xl font-semibold tracking-tight">本期变化</h2><p className="mt-1 text-sm text-muted-foreground">逐门店、逐指标比较上一周期；Missing 单独处理，不计作未通过。</p></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ChangeColumn title="新增" items={attribution.newIssues} tone="red" issues={issues} />
        <ChangeColumn title="持续" items={attribution.persistentIssues} tone="amber" issues={issues} />
        <ChangeColumn title="已恢复" items={attribution.recovered} tone="green" issues={issues} />
      </div>
    </section>
  )
}
