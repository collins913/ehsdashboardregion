"use client"

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
  XAxis,
  YAxis,
} from "recharts"
import type { TooltipContentProps } from "recharts"
import type {
  OverviewDemoAttentionPoint,
  OverviewDemoBenchmark,
  OverviewDemoDimensionMetricView,
  OverviewDemoHistoryPoint,
  OverviewDemoIssueAreaDistribution,
} from "../model/overview-demo-types"

const primary = "var(--primary)"
const red = "#dc2626"
const amber = "#d97706"
const green = "#16a34a"

export function OverviewDemoTrendChart({ history, compact = false }: { history: readonly OverviewDemoHistoryPoint[]; compact?: boolean }) {
  return <div className={compact ? "h-10 w-40" : "h-36 w-full"}><ResponsiveContainer width="100%" height="100%"><LineChart data={[...history]} margin={compact ? { top: 4, right: 4, bottom: 4, left: 4 } : { top: 10, right: 12, bottom: 8, left: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" opacity={compact ? 0 : 0.7} /><XAxis dataKey="periodLabel" hide={compact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} hide tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} /><Tooltip formatter={(value) => [`${value ?? "—"}`, "Score"]} /><Line type="monotone" dataKey="score" stroke={primary} strokeWidth={compact ? 2.5 : 3} dot={compact ? false : { r: 3, fill: "var(--background)", strokeWidth: 2 }} connectNulls /></LineChart></ResponsiveContainer></div>
}

export function OverviewDemoAttentionChart({ points, averageScore, deltaRange, onSelect }: { points: readonly OverviewDemoAttentionPoint[]; averageScore: number | null; deltaRange: number; onSelect: (id: string) => void }) {
  const regular = points.filter((point) => !point.labelVisible)
  const labeled = points.filter((point) => point.labelVisible)
  const open = (entry: unknown) => {
    const value = entry as { id?: string; payload?: { id?: string } }
    const id = value.payload?.id ?? value.id
    if (id) onSelect(id)
  }
  const tooltip = ({ active, payload }: TooltipContentProps) => {
    const point = payload?.[0]?.payload as OverviewDemoAttentionPoint | undefined
    if (!active || !point) return null
    return <div className="rounded-md border bg-background p-2 text-xs shadow-md"><p className="font-semibold">{point.label}</p><p className="mt-1 text-muted-foreground">Score {point.score ?? "—"} · Delta {point.delta !== null && point.delta > 0 ? "+" : ""}{point.delta ?? "—"}</p><p className="text-muted-foreground">Complete {point.completeness}% · {point.topIssue ?? "无当前重点问题"}</p></div>
  }
  return <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 24, right: 24, bottom: 18, left: 8 }}><ReferenceArea x1={averageScore ?? 50} x2={100} y1={0} y2={deltaRange} fill={green} fillOpacity={0.06} /><ReferenceArea x1={0} x2={averageScore ?? 50} y1={-deltaRange} y2={0} fill={red} fillOpacity={0.06} /><ReferenceArea x1={0} x2={100} y1={0} y2={deltaRange} fill={amber} fillOpacity={0.025} /><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis type="number" dataKey="score" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="number" dataKey="delta" domain={[-deltaRange, deltaRange]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} /><ReferenceLine x={averageScore ?? 50} stroke="var(--muted-foreground)" strokeDasharray="4 4" /><ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" /><Tooltip content={tooltip} /><Scatter data={regular} fill={primary} cursor="pointer" onClick={open}>{regular.map((point) => <Cell key={point.id} fill={(point.delta ?? 0) > 0 ? green : (point.delta ?? 0) < 0 ? red : amber} />)}</Scatter><Scatter data={labeled} fill={primary} cursor="pointer" onClick={open}>{labeled.map((point) => <Cell key={point.id} fill={(point.delta ?? 0) > 0 ? green : (point.delta ?? 0) < 0 ? red : amber} />)}<LabelList dataKey="label" position="top" className="fill-foreground text-[10px]" /></Scatter></ScatterChart></ResponsiveContainer></div>
}

export function OverviewDemoAreaDistributionChart({ data }: { data: readonly OverviewDemoIssueAreaDistribution[] }) {
  return <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...data]} layout="vertical" margin={{ top: 2, right: 24, bottom: 2, left: 10 }}><CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis type="category" dataKey="area" width={86} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value ?? 0} stores`, "Affected"]} /><Bar dataKey="count" fill={primary} radius={[0, 4, 4, 0]}><LabelList dataKey="share" position="right" formatter={(value: unknown) => `${value}%`} className="fill-muted-foreground text-[10px]" /></Bar></BarChart></ResponsiveContainer></div>
}

export function OverviewDemoLifecycleChart({ current, newCount, persistentCount }: { current: number; newCount: number; persistentCount: number }) {
  const other = Math.max(0, current - newCount - persistentCount)
  return <div className="h-10 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ label: "Current", newCount, persistentCount, other }]} layout="vertical" margin={{ top: 6, right: 0, bottom: 6, left: 0 }}><XAxis type="number" domain={[0, Math.max(1, current)]} hide /><YAxis type="category" dataKey="label" hide /><Tooltip /><Bar dataKey="newCount" stackId="lifecycle" fill={red} radius={[4, 0, 0, 4]} /><Bar dataKey="persistentCount" stackId="lifecycle" fill={amber} /><Bar dataKey="other" stackId="lifecycle" fill="var(--muted)" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
}

export function OverviewDemoBenchmarkChart({ current, benchmark }: { current: number | null; benchmark: OverviewDemoBenchmark }) {
  const data = [{ label: "Current", value: current }, { label: benchmark.parentLabel, value: benchmark.parentAverage }]
  return <div className="h-20 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }}><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" fill={primary} radius={[0, 4, 4, 0]}><LabelList dataKey="value" position="right" className="fill-foreground text-[10px]" /></Bar></BarChart></ResponsiveContainer></div>
}

export function OverviewDemoMetricBars({ items }: { items: readonly OverviewDemoDimensionMetricView[] }) {
  const data = items.map((item) => ({ label: item.label, passRate: item.availableCount === 0 ? 0 : Math.round(item.passCount / item.availableCount * 100), newIssueCount: item.newIssueCount, recoveredCount: item.recoveredCount }))
  return <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 2, right: 28, bottom: 2, left: 8 }}><CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} hide /><YAxis type="category" dataKey="label" width={128} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value ?? 0}%`, "Pass"]} /><Bar dataKey="passRate" fill={primary} radius={[0, 4, 4, 0]}><LabelList dataKey="passRate" position="right" formatter={(value: unknown) => `${value}%`} className="fill-muted-foreground text-[10px]" /></Bar></BarChart></ResponsiveContainer></div>
}
