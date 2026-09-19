"use client"

import { useState } from "react"
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { OverviewDemoDimensionView } from "../model/overview-demo-types"
import { OverviewDemoMetricBars } from "./overview-demo-charts"

function deltaLabel(delta: number | null) {
  if (delta === null) return "—"
  return `${delta > 0 ? "+" : ""}${delta}`
}

export function DimensionAnalysis({ dimensions }: { dimensions: readonly OverviewDemoDimensionView[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = dimensions[selectedIndex] ?? dimensions[0]

  return (
    <Card className="gap-3 py-5 shadow-none">
      <CardHeader className="px-5 sm:px-6"><CardTitle className="text-lg tracking-tight">Dimension Diagnosis</CardTitle><CardDescription>横向扫描维度表现；点击查看指标通过率与变化归因。</CardDescription></CardHeader>
      <CardContent className="px-5 sm:px-6">
        <div className="divide-y border-y">
          {dimensions.map((dimension, index) => (
            <button key={dimension.id} type="button" aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)} className={cn("grid w-full grid-cols-[minmax(0,1fr)_4rem_4rem_1rem] items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/40", selectedIndex === index && "bg-primary/[0.04]")}>
              <span className="min-w-0"><span className="text-sm font-medium">{dimension.label}</span><span className="ml-2 text-xs text-muted-foreground">{dimension.isTbd ? "评分与趋势口径待定义" : `${dimension.passStores}/${dimension.totalStores} stores fully pass`}</span></span>
              <strong className="text-right text-xl tabular-nums">{dimension.score ?? "TBD"}</strong>
              <span className={dimension.delta === null ? "text-right text-xs text-muted-foreground" : dimension.delta >= 0 ? "text-right text-xs text-emerald-700" : "text-right text-xs text-red-700"}>{deltaLabel(dimension.delta)}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        {selected ? <div className="mt-4 grid gap-5 bg-muted/20 p-4 lg:grid-cols-[0.72fr_1.28fr]">
          <div><div className="flex items-center gap-2"><h3 className="font-semibold">{selected.label} 诊断</h3>{selected.isTbd ? <Badge variant="outline">TBD</Badge> : null}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.explanation}</p><div className="mt-4 space-y-2 text-sm"><p className="flex gap-2"><ArrowDownRight className="mt-0.5 size-4 shrink-0 text-red-700" /><span><span className="text-muted-foreground">主要拖累：</span>{selected.primaryDrag}</span></p><p className="flex gap-2"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-emerald-700" /><span><span className="text-muted-foreground">主要改善：</span>{selected.primaryImprovement}</span></p></div></div>
          {selected.items.length > 0 ? <OverviewDemoMetricBars items={selected.items} /> : <div className="grid min-h-32 place-items-center border border-dashed bg-background text-sm text-muted-foreground">Environment scoring model: TBD</div>}
        </div> : null}
      </CardContent>
    </Card>
  )
}
