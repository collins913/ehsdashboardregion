import type { ReactNode } from "react";
import { CircleAlert, Info } from "lucide-react";
import { statusBadgeClassName } from "@/components/shared/status-display";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DataAvailability } from "@/data/contracts/kpi";

const availabilityLabels: Record<DataAvailability, string> = {
  AVAILABLE: "可用",
  CONFIRMED_EMPTY: "确认无数据",
  INCOMPLETE: "数据不完整",
  UNAVAILABLE: "数据不可用",
};

const availabilityDescriptions: Record<DataAvailability, string> = {
  AVAILABLE: "请求范围内的数据可用。",
  CONFIRMED_EMPTY: "请求范围已确认无记录。",
  INCOMPLETE: "请求范围内的数据不完整，无法支持业务结论。",
  UNAVAILABLE: "请求范围内的数据不可用。",
};

export function DataAvailabilityDisplay({
  availability,
  label,
  description,
  appearance = "badge",
}: {
  availability: DataAvailability;
  label?: ReactNode;
  description?: ReactNode;
  appearance?: "badge" | "text";
}) {
  const Icon = availability === "INCOMPLETE" || availability === "UNAVAILABLE" ? CircleAlert : Info;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {appearance === "text" ? (
          <span data-availability={availability.toLowerCase()} className="text-muted-foreground">
            {label ?? availabilityLabels[availability]}
          </span>
        ) : <Badge
          variant="outline"
          data-availability={availability.toLowerCase()}
          data-status-badge=""
          className={`${statusBadgeClassName} group-hover/table-cell-trigger:bg-muted`}
        >
          <Icon aria-hidden="true" />
          <span className="min-w-0 text-center">{label ?? availabilityLabels[availability]}</span>
        </Badge>}
      </TooltipTrigger>
      <TooltipContent>{description ?? availabilityDescriptions[availability]}</TooltipContent>
    </Tooltip>
  );
}

export { availabilityLabels };
