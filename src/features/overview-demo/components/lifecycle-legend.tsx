import { overviewDemoLifecycleCategories } from "../model/overview-demo-issues"

const swatches = ["bg-red-600", "bg-amber-600", "bg-emerald-600"] as const

export function LifecycleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground" aria-label="问题变化颜色">
      {overviewDemoLifecycleCategories.map((label, index) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${swatches[index]}`} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  )
}
