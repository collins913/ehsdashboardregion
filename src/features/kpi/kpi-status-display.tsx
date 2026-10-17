import type { ComponentProps } from "react";
import { StatusDisplay, getStatusLabel, type BusinessStatus } from "@/components/shared/status-display";

// KPI wording only; source statuses, business results and scoring remain unchanged.
export function getKpiStatusLabel(status: BusinessStatus) {
  return status === "ACHIEVED" ? "已完成" : getStatusLabel(status);
}

export function KpiStatusDisplay(props: ComponentProps<typeof StatusDisplay>) {
  const label = props.label ?? getKpiStatusLabel(props.status);
  return <StatusDisplay {...props} label={label} />;
}
