"use client"

import { memo, useRef, useState } from "react"
import { useAnalyticsChartAnimationEnabled } from "@/components/shared/use-analytics-motion"
import { ANALYTICS_CHART_ANIMATION_DURATION } from "@/components/shared/analytics-layout"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatOverviewRate, formatOverviewScore, ScoreChange } from "./score-change"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type {
  OverviewAttentionGroup,
  OverviewChartDomain,
  OverviewHistoryPoint,
} from "@/data/contracts/overview"

const primary = "var(--primary)"
const monthlyTrendConfig = { score: { label: "综合得分", color: "var(--primary)" } } satisfies ChartConfig

export function selectOverviewAttentionPoint(entry: unknown, onSelect: (id: string, trigger?: HTMLElement | null) => void, trigger?: HTMLElement | null) {
  const value = entry as { id?: string; payload?: { id?: string } }
  const id = value.payload?.id ?? value.id
  if (id) { if (trigger) onSelect(id, trigger); else onSelect(id) }
}

export function overviewScoreDomain(history: readonly OverviewHistoryPoint[]): [number, number] | null {
  const scores = history.flatMap(({ score }) => typeof score === "number" && Number.isFinite(score) ? [score] : [])
  if (scores.length === 0) return null

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  if (min !== max) return [min, max]

  return [Math.max(0, min - 1), Math.min(100, max + 1)]
}

export function OverviewMonthlyTrendChart({ history, showSparseTicks = false, showAsRate = false }: { history: readonly OverviewHistoryPoint[]; showSparseTicks?: boolean; showAsRate?: boolean }) {
  const chartAnimationEnabled = useAnalyticsChartAnimationEnabled()
  const domain = overviewScoreDomain(history) ?? [0, 100]
  const label = showAsRate ? "综合得分率" : "综合得分"
  const data = history.map((point) => ({ ...point, scoreRate: point.score }))
  const config = showAsRate ? { scoreRate: { label, color: primary } } : monthlyTrendConfig
  return <div data-testid="monthly-score-trend" className="mt-3">
    <span className="text-sm font-medium leading-5 text-muted-foreground">{history.length ? `可用历史：${history[0].periodLabel} 至 ${history.at(-1)?.periodLabel}` : "暂无可用历史"}</span>
    <div className={showSparseTicks ? "mt-1 h-24 w-full" : "mt-1 h-20 w-full"}><ChartContainer config={config} className="h-full w-full aspect-auto"><LineChart data={data} margin={{ top: 6, right: showSparseTicks ? 16 : 4, bottom: 2, left: showSparseTicks ? 16 : 4 }}>
      <XAxis dataKey="periodLabel" hide={!showSparseTicks} interval="preserveStartEnd" minTickGap={24} tick={{ fontSize: 9 }} tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} /><YAxis domain={domain} hide />
      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(month) => String(month ?? "")} formatter={(value) => <div className="flex flex-1 justify-between gap-3"><span>{label}</span><span className="font-mono font-medium tabular-nums">{typeof value !== "number" ? "—" : `${showAsRate ? formatOverviewRate(value) : formatOverviewScore(value)}${showAsRate ? "%" : " 分"}`}</span></div>} />} />
      <Line name={label} type="monotone" dataKey={showAsRate ? "scoreRate" : "score"} stroke={showAsRate ? "var(--color-scoreRate)" : "var(--color-score)"} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={chartAnimationEnabled} animationDuration={ANALYTICS_CHART_ANIMATION_DURATION} animationEasing="ease-out" />
    </LineChart></ChartContainer></div>
  </div>
}

export function AttentionPointGroup({ cx, cy, payload, onSelect }: {
  cx?: number
  cy?: number
  payload?: OverviewAttentionGroup
  onSelect: (id: string, trigger?: HTMLElement | null) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedRef = useRef(false)
  if (cx === undefined || cy === undefined || !payload) return null
  const unit = payload.level === "STORE" ? "家门店" : payload.level === "AREA" ? "个小区" : "个区域"
  const description = `当前得分率 ${formatOverviewScore(payload.score)}%，变化 ${formatOverviewScore(payload.delta)} pp，共 ${payload.count} ${unit}`
  const trigger = <button ref={triggerRef} type="button" aria-label={`${payload.count === 1 ? `查看${payload.members[0].label}详情` : `选择同坐标${unit.slice(1)}`}，${description}`} title={description}
    onClick={payload.count === 1 ? () => selectOverviewAttentionPoint(payload.members[0], onSelect, triggerRef.current) : undefined}
    className="relative h-5 w-5 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
    {payload.count > 1 ? <span aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-foreground">×{payload.count}</span> : null}
  </button>
  return <foreignObject x={cx - 10} y={cy - 10} width={20} height={20} overflow="visible">
    {payload.count === 1 ? trigger : <DropdownMenu open={open} onOpenChange={(value) => { if (value) selectedRef.current = false; setOpen(value) }}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="w-64 max-w-[calc(100vw-2rem)]" aria-label={`同坐标${unit.slice(1)}`}
        onCloseAutoFocus={(event) => { if (selectedRef.current) event.preventDefault() }}>
        <DropdownMenuLabel>共 {payload.count} {unit} · 选择查看详情</DropdownMenuLabel>
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">得分率 {formatOverviewScore(payload.score)}% · 变化 <ScoreChange value={payload.delta} /></DropdownMenuLabel>
        <DropdownMenuSeparator />
        {payload.members.map((member) => <DropdownMenuItem key={member.id} className="whitespace-normal break-words" onSelect={() => {
          selectedRef.current = true
          setOpen(false)
          selectOverviewAttentionPoint(member, onSelect, triggerRef.current)
        }}>{member.label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>}
  </foreignObject>
}

export const OverviewAttentionChart = memo(function OverviewAttentionChart({ groups, xDomain, yDomain, averageScore, onSelect }: { groups: readonly OverviewAttentionGroup[]; xDomain: OverviewChartDomain; yDomain: OverviewChartDomain; averageScore: number | null; onSelect: (id: string, trigger?: HTMLElement | null) => void }) {
  return <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%">
    <ScatterChart margin={{ top: 28, right: 30, bottom: 18, left: 8 }}>
      {averageScore !== null ? <>
        <ReferenceArea x1={averageScore} x2={xDomain[1]} y1={0} y2={yDomain[1]} fill="currentColor" fillOpacity={0.06} stroke="none" className="text-green-500" />
        <ReferenceArea x1={xDomain[0]} x2={averageScore} y1={yDomain[0]} y2={0} fill="currentColor" fillOpacity={0.06} stroke="none" className="text-red-500" />
      </> : null}
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis type="number" dataKey="score" domain={[...xDomain]} tickFormatter={(value: number) => `${formatOverviewScore(value)}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDataOverflow />
      <YAxis type="number" dataKey="delta" domain={[...yDomain]} tickFormatter={(value: number) => `${formatOverviewScore(value)} pp`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} allowDataOverflow />
      {averageScore !== null ? <ReferenceLine x={averageScore} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}
      <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
      <Scatter data={groups} isAnimationActive={false} shape={<AttentionPointGroup onSelect={onSelect} />} />
    </ScatterChart>
  </ResponsiveContainer></div>
})
