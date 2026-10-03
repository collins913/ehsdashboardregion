"use client"

import { ScoreChange } from "./score-change"
import { OverflowTooltip } from "@/components/shared/overflow-tooltip"
import type { OverviewRankedScope } from "@/data/contracts/overview"
import { cn } from "@/lib/utils"

type Entry = OverviewRankedScope
const levels = [
  { rank: 1, accent: "border-amber-500/20 bg-amber-500/5", height: "h-16", column: "col-start-2" },
  { rank: 2, accent: "border-slate-400/20 bg-slate-400/5", height: "h-10", column: "col-start-1" },
  { rank: 3, accent: "border-amber-700/20 bg-amber-700/5", height: "h-6", column: "col-start-3" },
] as const

export function ChangeRankingPodium({ improving, declining, onSelect }: {
  improving: readonly Entry[]
  declining: readonly Entry[]
  onSelect?: (id: string) => void
}) {
  const half = (entries: readonly Entry[], inverted: boolean) => <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-3" aria-label={inverted ? "退步 Top 3" : "提升 Top 3"}>
    {levels.map(({ rank, accent, height, column }) => {
      const item = entries[rank - 1]
      return <section key={rank} aria-label={`${inverted ? "退步" : "提升"}第 ${rank} 名${item ? "" : "暂无数据"}`} className={cn("flex min-w-0 flex-col row-start-1", column, inverted ? "justify-start" : "justify-end")}>
        <div aria-hidden="true" className={cn("w-full border", height, accent, inverted ? "order-first rounded-b-md border-t-0" : "order-last rounded-t-md border-b-0")} />
        <div className="min-w-0 py-2">
          {item ? <button type="button" disabled={!onSelect} onClick={() => onSelect?.(item.scopeId)} aria-label={`查看${item.label}${inverted ? "退步" : "提升"}第${rank}名详情`} className="flex w-full min-w-0 items-center gap-1 rounded-sm text-left transition-colors duration-150 hover:bg-muted/50 hover:text-muted-foreground focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
            <OverflowTooltip text={item.label} className="flex-1 text-sm" focusable={false} />
            <ScoreChange value={item.delta} className="shrink-0 text-sm font-medium" />
          </button> : <div aria-hidden="true" className="h-5" />}
        </div>
      </section>
    })}
  </div>

  return <div data-testid="change-ranking-podium">
    {half(improving, false)}
    <div role="separator" aria-label="独立排名基准线" className="my-2 border-t border-border" />
    {half(declining, true)}
    {improving.length === 0 && declining.length === 0 && <p className="mt-2 text-sm text-muted-foreground">无可比较数据</p>}
  </div>
}
