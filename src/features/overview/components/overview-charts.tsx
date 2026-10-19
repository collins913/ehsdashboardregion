"use client"

import { memo, useMemo, useRef, useState } from "react"
import { usePrefersReducedMotion } from "@/components/shared/use-analytics-motion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatOverviewRate, formatOverviewScore, ScoreChange } from "./score-change"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
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

const attentionConfig = { score: { label: "得分率", color: "var(--chart-1)" } } satisfies ChartConfig
const monthlyTrendConfig = { score: { label: "综合得分", color: "var(--chart-1)" } } satisfies ChartConfig

export function selectOverviewAttentionPoint(entry: unknown, onSelect: (id: string, trigger?: HTMLElement | null) => void, trigger?: HTMLElement | null) {
  const value = entry as { id?: string; payload?: { id?: string } }
  const id = value.payload?.id ?? value.id
  if (id) { if (trigger) onSelect(id, trigger); else onSelect(id) }
}

export function getAttentionTooltipData(entry: unknown) {
  const root = entry as { payload?: unknown; members?: unknown } | null
  const candidates = [root, root?.payload, (root?.payload as { payload?: unknown } | undefined)?.payload]
  const group = candidates.find((candidate): candidate is OverviewAttentionGroup => {
    if (!candidate || typeof candidate !== "object") return false
    const value = candidate as Partial<OverviewAttentionGroup>
    return Array.isArray(value.members) && typeof value.score === "number" && typeof value.count === "number"
  })
  if (!group) return null
  return {
    names: group.members.map((member) => member.label).join("、"),
    count: group.count,
    unit: group.level === "STORE" ? "家门店" : group.level === "AREA" ? "个小区" : "个区域",
    score: group.score,
    delta: group.delta,
  }
}

export const OVERVIEW_SCORE_DOMAIN = [0, 100] as const
export const OVERVIEW_SCORE_TICKS = [0, 25, 50, 75, 100] as const

export function OverviewMonthlyTrendChart({ history, showAsRate = false, fillHeight = false }: { history: readonly OverviewHistoryPoint[]; showAsRate?: boolean; fillHeight?: boolean }) {
  const chartAnimationEnabled = !usePrefersReducedMotion()
  const label = showAsRate ? "综合得分率" : "综合得分"
  const data = useMemo(() => history.map((point) => ({ ...point, scoreRate: point.score })), [history])
  const config = showAsRate ? { scoreRate: { label, color: "var(--chart-1)" } } : monthlyTrendConfig
  if (history.length === 0) return null
  return <div data-testid="monthly-score-trend" className={fillHeight ? "mt-2 flex min-h-0 flex-1 flex-col" : "mt-3"}>
    <p className="text-xs text-muted-foreground">趋势</p>
    <div className={fillHeight ? "mt-1 min-h-40 w-full flex-1" : "mt-1 h-40 w-full"}><ChartContainer config={config} className="h-full w-full aspect-auto"><LineChart accessibilityLayer data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="periodLabel" interval="preserveStartEnd" minTickGap={8} tick={{ fontSize: 10 }} tickFormatter={(value: string) => `${Number(value.slice(5))}月`} axisLine={false} tickLine={false} tickMargin={8} />
      <YAxis domain={OVERVIEW_SCORE_DOMAIN} ticks={OVERVIEW_SCORE_TICKS} allowDataOverflow tick={{ fontSize: 10 }} tickFormatter={(value: number) => `${formatOverviewRate(value)}%`} axisLine={false} tickLine={false} width={38} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(month) => String(month ?? "")} formatter={(value) => <div className="flex flex-1 justify-between gap-3"><span>{label}</span><span className="font-mono font-medium tabular-nums">{typeof value !== "number" ? "—" : `${showAsRate ? formatOverviewRate(value) : formatOverviewScore(value)}${showAsRate ? "%" : " 分"}`}</span></div>} />} />
      <Line key={chartAnimationEnabled ? "animated-trend" : "static-trend"} name={label} type="monotone" dataKey={showAsRate ? "scoreRate" : "score"} stroke={showAsRate ? "var(--color-scoreRate)" : "var(--color-score)"} strokeWidth={2} dot={{ r: 3, fill: showAsRate ? "var(--color-scoreRate)" : "var(--color-score)" }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={chartAnimationEnabled} animationDuration={550} animationEasing="ease-out" />
    </LineChart></ChartContainer></div>
  </div>
}

export function AttentionPointGroup({ cx, cy, payload, onSelect, onMenuOpenChange }: {
  cx?: number
  cy?: number
  payload?: OverviewAttentionGroup
  onSelect: (id: string, trigger?: HTMLElement | null) => void
  onMenuOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedRef = useRef(false)
  if (cx === undefined || cy === undefined || !payload) return null
  const tooltipData = getAttentionTooltipData(payload)!
  const description = `${tooltipData.names}；当前得分率 ${formatOverviewScore(payload.score)}%，变化 ${formatOverviewScore(payload.delta)}%，共 ${payload.count} ${tooltipData.unit}`
  const trigger = <button ref={triggerRef} type="button" aria-label={`${payload.count === 1 ? `查看${payload.members[0].label}详情` : `选择同坐标${tooltipData.unit.slice(1)}`}，${description}`}
    onClick={payload.count === 1 ? () => selectOverviewAttentionPoint(payload.members[0], onSelect, triggerRef.current) : undefined}
    className="relative h-5 w-5 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--chart-1)]" />
    {payload.count > 1 ? <span aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-foreground">×{payload.count}</span> : null}
  </button>
  return <foreignObject x={cx - 10} y={cy - 10} width={20} height={20} overflow="visible">
    {payload.count === 1 ? trigger : <DropdownMenu open={open} onOpenChange={(value) => { if (value) selectedRef.current = false; setOpen(value); onMenuOpenChange?.(value) }}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="w-64 max-w-[calc(100vw-2rem)]" aria-label={`同坐标${tooltipData.unit.slice(1)}`}
        onCloseAutoFocus={(event) => { if (selectedRef.current) event.preventDefault() }}>
        <DropdownMenuLabel>共 {payload.count} {tooltipData.unit} · 选择查看详情</DropdownMenuLabel>
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
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="h-full w-full"><ChartContainer config={attentionConfig} className="h-full w-full aspect-auto">
    <ScatterChart margin={{ top: 28, right: 30, bottom: 18, left: 8 }}>
      {averageScore !== null ? <>
        <ReferenceArea x1={averageScore} x2={xDomain[1]} y1={0} y2={yDomain[1]} fill="currentColor" fillOpacity={0.06} stroke="none" className="text-green-500" />
        <ReferenceArea x1={xDomain[0]} x2={averageScore} y1={yDomain[0]} y2={0} fill="currentColor" fillOpacity={0.06} stroke="none" className="text-red-500" />
      </> : null}
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis type="number" dataKey="score" domain={[...xDomain]} tickFormatter={(value: number) => `${formatOverviewScore(value)}%`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDataOverflow />
      <YAxis type="number" dataKey="delta" domain={[...yDomain]} tickFormatter={(value: number) => `${formatOverviewScore(value)}%`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={64} allowDataOverflow />
      {averageScore !== null ? <ReferenceLine x={averageScore} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}
      <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
      <ChartTooltip active={menuOpen ? false : undefined} cursor={false} content={(props) => <ChartTooltipContent active={props.active} payload={props.payload.filter((item) => getAttentionTooltipData(item) !== null).slice(0, 1)} label={props.label} hideLabel className="max-h-48 max-w-72 overflow-y-auto" formatter={(_value, _name, item) => {
        const tooltip = getAttentionTooltipData(item)
        if (!tooltip) return null
        return <div className="grid min-w-40 flex-1 gap-1.5">
          <span className="break-words font-medium">{tooltip.names}</span>
          {tooltip.count > 1 ? <span className="text-muted-foreground">共 {tooltip.count} {tooltip.unit}</span> : null}
          <span className="flex justify-between gap-3"><span>得分率</span><span className="font-mono tabular-nums">{formatOverviewScore(tooltip.score)}%</span></span>
          <span className="flex justify-between gap-3"><span>变化</span><ScoreChange value={tooltip.delta} /></span>
        </div>
      }} />} />
      <Scatter data={groups} name="同级对象" isAnimationActive={false} shape={<AttentionPointGroup onSelect={onSelect} onMenuOpenChange={setMenuOpen} />} />
    </ScatterChart>
  </ChartContainer></div>
})
