import type { ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
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
    icon: Clock3,
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
    icon: Minus,
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

const emphasisClassNames: Record<StatusEmphasis, string> = {
  PRIMARY: "border-transparent bg-primary text-primary-foreground",
  SECONDARY: "border-transparent bg-secondary text-secondary-foreground",
  NEUTRAL: "border-border bg-background text-muted-foreground",
};

const interactiveClassNames: Record<StatusEmphasis, string> = {
  PRIMARY: "group-hover/table-cell-trigger:bg-primary/80",
  SECONDARY:
    "group-hover/table-cell-trigger:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
  NEUTRAL:
    "group-hover/table-cell-trigger:bg-muted group-hover/table-cell-trigger:text-foreground",
};

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
  interactive?: boolean;
  className?: string;
};

export function StatusDisplay({
  status,
  label,
  showIcon = true,
  interactive = false,
  className,
}: StatusDisplayProps) {
  const definition = statusDefinitions[status];
  const Icon = definition.icon;

  return (
    <Badge
      variant="outline"
      data-intent={definition.intent.toLowerCase()}
      data-emphasis={definition.emphasis.toLowerCase()}
      className={cn(
        emphasisClassNames[definition.emphasis],
        interactive && interactiveClassNames[definition.emphasis],
        className,
      )}
    >
      {showIcon ? <Icon aria-hidden="true" /> : null}
      {label ?? definition.label}
    </Badge>
  );
}
