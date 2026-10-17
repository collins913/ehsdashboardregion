import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { Progress } from "@/components/ui/progress";

// All quantities and progress are prepared by the server; this row only presents them.
export function AnalyticsProgressItem({
  label,
  actualCount,
  requiredCount,
  progressValue,
  missingRequirementLabel,
}: {
  label: string;
  actualCount: number;
  requiredCount: number | null;
  progressValue: number | null;
  missingRequirementLabel: string;
}) {
  return (
    <li className="space-y-2">
      <OverflowTooltip text={label} className="text-sm leading-5" />
      <div className="flex items-center gap-3">
        <Progress value={progressValue} className={progressValue === null ? "bg-(--chart-2)" : "bg-(--chart-1) [&_[data-slot=progress-indicator]]:bg-(--chart-2)"} aria-label={label} aria-valuetext={`${actualCount.toLocaleString()} / ${requiredCount?.toLocaleString() ?? missingRequirementLabel}`} />
        <p className="shrink-0 text-sm tabular-nums">
          <span className="font-medium">{actualCount.toLocaleString()}</span>
          <span className="text-muted-foreground"> / {requiredCount?.toLocaleString() ?? missingRequirementLabel}</span>
        </p>
      </div>
    </li>
  );
}
