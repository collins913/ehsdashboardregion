export function DetailDelta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  return <span className={value === null || value === 0 ? "tabular-nums text-muted-foreground" : value > 0 ? "tabular-nums text-emerald-700 dark:text-emerald-400" : "tabular-nums text-red-700 dark:text-red-400"}>
    {value === null ? "—" : `${value > 0 ? "+" : ""}${value}`}{suffix}
  </span>
}
