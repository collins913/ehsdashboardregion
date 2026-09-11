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
    emphasis: "NEUTRAL",
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
  className?: string;
};

export function StatusDisplay({ status, className }: StatusDisplayProps) {
  const definition = statusDefinitions[status];
  const Icon = definition.icon;

  return (
    <Badge
      variant="outline"
      data-intent={definition.intent.toLowerCase()}
      data-emphasis={definition.emphasis.toLowerCase()}
      className={cn(emphasisClassNames[definition.emphasis], className)}
    >
      <Icon aria-hidden="true" />
      {definition.label}
    </Badge>
  );
}
