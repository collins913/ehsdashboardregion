"use client"

import { useState } from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  usePlotArea,
  XAxis,
  YAxis,
} from "recharts"
import type { PlotArea, TooltipContentProps } from "recharts"
import type {
  OverviewDemoAttentionPoint,
  OverviewDemoBenchmark,
  OverviewDemoChartDomain,
  OverviewDemoDimensionMetricView,
  OverviewDemoHistoryPoint,
  OverviewDemoIssueAreaDistribution,
  OverviewDemoIssueView,
} from "../model/overview-demo-types"

const primary = "var(--primary)"
const red = "#dc2626"
const amber = "#d97706"
const green = "#16a34a"

export function selectOverviewDemoAttentionPoint(entry: unknown, onSelect: (id: string) => void) {
  const value = entry as { id?: string; payload?: { id?: string } }
  const id = value.payload?.id ?? value.id
  if (id) onSelect(id)
}

export function attentionDirectionLabelPositions(plot: PlotArea) {
  const middleX = plot.x + plot.width / 2
  const middleY = plot.y + plot.height / 2
  return {
    low: { x: plot.x + 8, y: middleY },
    high: { x: plot.x + plot.width - 8, y: middleY },
    improving: { x: middleX, y: plot.y + 12 },
    declining: { x: middleX, y: plot.y + plot.height - 8 },
  }
}

export function AttentionDirectionLabels() {
  const plot = usePlotArea()
  if (!plot) return null

  const positions = attentionDirectionLabelPositions(plot)
  return <g fill="var(--muted-foreground)" fontSize={11} pointerEvents="none" aria-hidden="true">
    <text {...positions.low} dominantBaseline="middle">低分区</text>
    <text {...positions.high} textAnchor="end" dominantBaseline="middle">高分区</text>
    <text {...positions.improving} textAnchor="middle">进步区</text>
    <text {...positions.declining} textAnchor="middle">退步区</text>
  </g>
}

export function OverviewDemoTrendChart({ history, compact = false, detailCompact = false }: { history: readonly OverviewDemoHistoryPoint[]; compact?: boolean; detailCompact?: boolean }) {
  const condensed = compact || detailCompact
  return <div className={compact ? "h-10 w-40" : detailCompact ? "h-20 w-full" : "h-36 w-full"}><ResponsiveContainer width="100%" height="100%"><LineChart data={[...history]} margin={condensed ? { top: 6, right: 8, bottom: 4, left: 8 } : { top: 10, right: 12, bottom: 8, left: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" opacity={compact ? 0 : 0.7} /><XAxis dataKey="periodLabel" hide={compact} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} hide tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} /><Tooltip formatter={(value) => [`${value ?? "—"}`, "得分"]} /><Line type="monotone" dataKey="score" stroke={primary} strokeWidth={compact ? 2.5 : 3} dot={compact ? false : { r: 3, fill: "var(--background)", strokeWidth: 2 }} connectNulls /></LineChart></ResponsiveContainer></div>
}

export function OverviewDemoMonthlyTrendChart({ history }: { history: readonly OverviewDemoHistoryPoint[] }) {
  const [active, setActive] = useState<OverviewDemoHistoryPoint | null>(null)
  const displayed = active ?? history.at(-1)
  return <div data-testid="monthly-score-trend" className="mt-3">
    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span>过去 12 个月趋势</span>
      <span aria-live="polite" className="tabular-nums">{displayed?.periodLabel ?? "—"} · {displayed?.score ?? "—"} 分</span>
    </div>
    <div className="mt-1 h-20 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...history]} margin={{ top: 6, right: 4, bottom: 2, left: 4 }} onMouseMove={(state) => { const index = Number(state.activeIndex); setActive(Number.isInteger(index) ? history[index] ?? null : null) }} onMouseLeave={() => setActive(null)}>
      <XAxis dataKey="periodLabel" hide /><YAxis domain={[0, 100]} hide />
      <Line type="monotone" dataKey="score" stroke={primary} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls />
    </LineChart></ResponsiveContainer></div>
  </div>
}

export function OverviewDemoAttentionChart({ points, xDomain, yDomain, averageScore, onSelect }: { points: readonly OverviewDemoAttentionPoint[]; xDomain: OverviewDemoChartDomain; yDomain: OverviewDemoChartDomain; averageScore: number | null; onSelect: (id: string) => void }) {
  const regular = points.filter((point) => !point.labelVisible)
  const labeled = points.filter((point) => point.labelVisible)
  const open = (entry: unknown) => selectOverviewDemoAttentionPoint(entry, onSelect)
  const tooltip = ({ active, payload }: TooltipContentProps) => {
    const point = payload?.[0]?.payload as OverviewDemoAttentionPoint | undefined
    if (!active || !point) return null
    return <div className="max-w-72 rounded-md border bg-background p-2 text-xs shadow-md"><p className="font-semibold">{point.label}</p><p className="mt-1 text-muted-foreground">当前得分 {point.score ?? "—"} · 较上期 {point.delta !== null && point.delta > 0 ? "+" : ""}{point.delta ?? "—"}</p>{point.completeness < 100 ? <p className="text-muted-foreground">数据完整度 {point.completeness}%</p> : null}<p className="text-muted-foreground">主要变化：{point.mainChange}</p><p className="text-muted-foreground">当前关注：{point.currentConcern}</p></div>
  }
  return <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 28, right: 30, bottom: 18, left: 8 }}>{averageScore !== null ? <><ReferenceArea x1={averageScore} x2={xDomain[1]} y1={0} y2={yDomain[1]} fill={green} fillOpacity={0.055} /><ReferenceArea x1={xDomain[0]} x2={averageScore} y1={yDomain[0]} y2={0} fill={red} fillOpacity={0.055} /><ReferenceArea x1={xDomain[0]} x2={averageScore} y1={0} y2={yDomain[1]} fill={amber} fillOpacity={0.025} /><ReferenceArea x1={averageScore} x2={xDomain[1]} y1={yDomain[0]} y2={0} fill={amber} fillOpacity={0.025} /></> : null}<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis type="number" dataKey="score" domain={[...xDomain]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDataOverflow /><YAxis type="number" dataKey="delta" domain={[...yDomain]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={34} allowDataOverflow />{averageScore !== null ? <ReferenceLine x={averageScore} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}<ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" /><AttentionDirectionLabels /><Tooltip content={tooltip} /><Scatter data={regular} fill={primary} cursor="pointer" onClick={open}>{regular.map((point) => <Cell key={point.id} fill={(point.delta ?? 0) > 0 ? green : (point.delta ?? 0) < 0 ? red : amber} />)}</Scatter><Scatter data={labeled} fill={primary} cursor="pointer" onClick={open}>{labeled.map((point) => <Cell key={point.id} fill={(point.delta ?? 0) > 0 ? green : (point.delta ?? 0) < 0 ? red : amber} />)}<LabelList dataKey="label" position="top" className="fill-foreground text-[10px]" /></Scatter></ScatterChart></ResponsiveContainer></div>
}

export function OverviewDemoAreaDistributionChart({ data }: { data: readonly OverviewDemoIssueAreaDistribution[] }) {
  return <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...data]} layout="vertical" margin={{ top: 2, right: 24, bottom: 2, left: 10 }}><CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis type="category" dataKey="area" width={86} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value ?? 0} 家门店`, "受影响"]} /><Bar dataKey="count" fill={primary} radius={[0, 4, 4, 0]}><LabelList dataKey="share" position="right" formatter={(value: unknown) => `${value}%`} className="fill-muted-foreground text-[10px]" /></Bar></BarChart></ResponsiveContainer></div>
}

export function OverviewDemoLifecycleChart({ lifecycle }: { lifecycle: OverviewDemoIssueView["lifecycle"] }) {
  return <div className="h-10 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ label: "当前", newCount: lifecycle.new, persistentCount: lifecycle.persistent }]} layout="vertical" margin={{ top: 6, right: 0, bottom: 6, left: 0 }}><XAxis type="number" domain={[0, Math.max(1, lifecycle.current)]} hide /><YAxis type="category" dataKey="label" hide /><Tooltip /><Bar name="新增" dataKey="newCount" stackId="lifecycle" fill={red} radius={[4, 0, 0, 4]} /><Bar name="持续" dataKey="persistentCount" stackId="lifecycle" fill={amber} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
}

export function OverviewDemoBenchmarkChart({ current, benchmark }: { current: number | null; benchmark: OverviewDemoBenchmark }) {
  const data = current === null ? [] : [{ value: current, lane: 0 }]
  return <div className="mt-1 h-10 w-full"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}><XAxis type="number" dataKey="value" domain={[0, 100]} hide /><YAxis type="number" dataKey="lane" domain={[-1, 1]} hide />{benchmark.parentAverage !== null ? <ReferenceLine x={benchmark.parentAverage} stroke="var(--muted-foreground)" strokeDasharray="3 3" /> : null}<Scatter data={data} fill={primary} /></ScatterChart></ResponsiveContainer></div>
}

export function OverviewDemoMetricBars({ items }: { items: readonly OverviewDemoDimensionMetricView[] }) {
  const data = items.map((item) => ({ label: item.label, passRate: item.availableCount === 0 ? 0 : Math.round(item.passCount / item.availableCount * 100), newIssueCount: item.newIssueCount, recoveredCount: item.recoveredCount }))
  return <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 2, right: 28, bottom: 2, left: 8 }}><CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="label" width={128} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value ?? 0}%`, "通过率"]} /><Bar dataKey="passRate" fill={primary} radius={[0, 4, 4, 0]}><LabelList dataKey="passRate" position="right" formatter={(value: unknown) => `${value}%`} className="fill-muted-foreground text-[10px]" /></Bar></BarChart></ResponsiveContainer></div>
}
