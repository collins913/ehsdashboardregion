import type { ReactNode } from "react";
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
}: {
  availability: DataAvailability;
  label?: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          data-availability={availability.toLowerCase()}
          className="border-dashed bg-background text-muted-foreground"
        >
          {label ?? availabilityLabels[availability]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{availabilityDescriptions[availability]}</TooltipContent>
    </Tooltip>
  );
}

export { availabilityLabels };
