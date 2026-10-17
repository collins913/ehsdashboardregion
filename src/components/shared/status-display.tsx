import type { ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Loader,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ComplianceResult,
  OccurrenceResult,
  PerformanceResult,
  RecordState,
} from "@/lib/rules/result-types";

export type BusinessStatus =
  | PerformanceResult
  | OccurrenceResult
  | ComplianceResult
  | RecordState;

export type StatusIntent = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type StatusEmphasis = "PRIMARY" | "SECONDARY" | "NEUTRAL";

type StatusDefinition = {
  label: string;
  intent: StatusIntent;
  emphasis: StatusEmphasis;
  icon: LucideIcon;
};

const statusDefinitions: Record<BusinessStatus, StatusDefinition> = {
  ACHIEVED: {
    label: "达成",
    intent: "POSITIVE",
    emphasis: "SECONDARY",
    icon: CheckCircle2,
  },
  NOT_ACHIEVED: {
    label: "进行中",
    intent: "NEGATIVE",
    emphasis: "PRIMARY",
    icon: Loader,
  },
  UNDETERMINED: {
    label: "未确定",
    intent: "NEUTRAL",
    emphasis: "NEUTRAL",
    icon: Minus,
  },
  OCCURRED: {
    label: "发生",
    intent: "NEGATIVE",
    emphasis: "PRIMARY",
    icon: CircleAlert,
  },
  NOT_OCCURRED: {
    label: "无",
    intent: "POSITIVE",
    emphasis: "SECONDARY",
    icon: CheckCircle2,
  },
  OPEN: {
    label: "未关闭",
    intent: "NEUTRAL",
    emphasis: "PRIMARY",
    icon: Loader,
  },
  CLOSED: {
    label: "已关闭",
    intent: "NEUTRAL",
    emphasis: "SECONDARY",
    icon: CheckCircle2,
  },
  EXCLUDED: {
    label: "已排除",
    intent: "NEUTRAL",
    emphasis: "NEUTRAL",
    icon: Minus,
  },
  UNKNOWN: {
    label: "未知",
    intent: "NEUTRAL",
    emphasis: "NEUTRAL",
    icon: Minus,
  },
  NORMAL: {
    label: "正常",
    intent: "POSITIVE",
    emphasis: "SECONDARY",
    icon: CheckCircle2,
  },
  ABNORMAL: {
    label: "异常",
    intent: "NEGATIVE",
    emphasis: "PRIMARY",
    icon: CircleAlert,
  },
};

// Shared visual treatment; business intent/emphasis remain independent metadata.
// Match dashboard-01: the Badge primitive retains its natural content width.
export const statusBadgeClassName =
  "px-1.5 text-muted-foreground";

const completedIconClassName =
  "[&_circle]:fill-green-500 [&_circle]:stroke-green-500 [&_path]:stroke-white dark:[&_circle]:fill-green-400 dark:[&_circle]:stroke-green-400";

export function getStatusIcon(status: BusinessStatus): LucideIcon {
  return statusDefinitions[status].icon;
}

export function getStatusIntent(status: BusinessStatus): StatusIntent {
  return statusDefinitions[status].intent;
}

export function getStatusLabel(status: BusinessStatus): string {
  return statusDefinitions[status].label;
}

export function getStatusEmphasis(status: BusinessStatus): StatusEmphasis {
  return statusDefinitions[status].emphasis;
}

type StatusDisplayProps = {
  status: BusinessStatus;
  label?: ReactNode;
  showIcon?: boolean;
  icon?: LucideIcon;
  interactive?: boolean;
  className?: string;
};

export function StatusDisplay({
  status,
  label,
  showIcon = true,
  icon,
  interactive = false,
  className,
}: StatusDisplayProps) {
  const definition = statusDefinitions[status];
  const Icon = icon ?? definition.icon;
  const content = label ?? definition.label;

  return (
    <Badge
      variant="outline"
      data-status-badge=""
      data-intent={definition.intent.toLowerCase()}
      data-emphasis={definition.emphasis.toLowerCase()}
      className={cn(
        statusBadgeClassName,
        interactive && "group-hover/table-cell-trigger:bg-muted",
        className,
      )}
    >
      {showIcon ? <Icon aria-hidden="true" className={Icon === CheckCircle2 ? completedIconClassName : undefined} /> : null}
      {content}
    </Badge>
  );
}
