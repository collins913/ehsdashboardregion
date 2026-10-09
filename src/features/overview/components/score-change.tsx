import { cn } from "@/lib/utils"

const scoreFormatter = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false })
const rateFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0, useGrouping: false })

export function formatOverviewScore(value: number | null) {
  return value === null ? "—" : Number.isInteger(value) ? String(value) : scoreFormatter.format(value)
}

export function formatOverviewRate(value: number | null) {
  return value === null ? "—" : rateFormatter.format(value)
}

export function ScoreChange({ value, suffix = "%", className }: { value: number | null; suffix?: string; className?: string }) {
  const tone = value === null ? "text-muted-foreground"
    : value > 0 ? "text-green-700 dark:text-green-400"
    : value < 0 ? "text-red-600 dark:text-red-400"
    : "text-foreground"

  return <span className={cn("tabular-nums", tone, className)}>{value === null ? "—" : `${value > 0 ? "+" : ""}${formatOverviewScore(value)}${suffix}`}</span>
}
