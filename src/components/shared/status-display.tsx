import {
  CheckCircle2,
  CircleAlert,
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

type StatusDefinition = {
  label: string;
  intent: StatusIntent;
  icon: LucideIcon;
};

const statusDefinitions: Record<BusinessStatus, StatusDefinition> = {
  ACHIEVED: { label: "达成", intent: "POSITIVE", icon: CheckCircle2 },
  NOT_ACHIEVED: {
    label: "未达成",
    intent: "NEGATIVE",
    icon: CircleAlert,
  },
  UNDETERMINED: { label: "—", intent: "NEUTRAL", icon: Minus },
  OCCURRED: { label: "发生", intent: "NEGATIVE", icon: CircleAlert },
  NOT_OCCURRED: {
    label: "未发生",
    intent: "POSITIVE",
    icon: CheckCircle2,
  },
  OPEN: { label: "Open", intent: "NEUTRAL", icon: Minus },
  CLOSED: { label: "Closed", intent: "NEUTRAL", icon: Minus },
  EXCLUDED: { label: "Excluded", intent: "NEUTRAL", icon: Minus },
  UNKNOWN: { label: "Unknown", intent: "NEUTRAL", icon: Minus },
  NORMAL: { label: "正常", intent: "POSITIVE", icon: CheckCircle2 },
  ABNORMAL: { label: "异常", intent: "NEGATIVE", icon: CircleAlert },
};

const intentClassNames: Record<StatusIntent, string> = {
  POSITIVE: "border-transparent bg-primary text-primary-foreground",
  NEGATIVE: "border-border bg-muted text-foreground",
  NEUTRAL: "border-border bg-background text-muted-foreground",
};

export function getStatusIntent(status: BusinessStatus): StatusIntent {
  return statusDefinitions[status].intent;
}

export function getStatusLabel(status: BusinessStatus): string {
  return statusDefinitions[status].label;
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
      className={cn(intentClassNames[definition.intent], className)}
    >
      <Icon aria-hidden="true" />
      {definition.label}
    </Badge>
  );
}
