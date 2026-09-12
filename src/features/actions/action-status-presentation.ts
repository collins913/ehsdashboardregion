import type { KnownActionStatus, ParsedActionStatus } from "@/types/ehs";

export type ActionStatusVisualStatus =
  | "OPEN"
  | "CLOSED"
  | "UNKNOWN";

export type ActionStatusPresentation = {
  label: string;
  visualStatus: ActionStatusVisualStatus;
};

const actionStatusPresentations: Record<
  KnownActionStatus,
  ActionStatusPresentation
> = {
  Assigned: { label: "已分配", visualStatus: "OPEN" },
  "In Progress": { label: "进行中", visualStatus: "OPEN" },
  "In Review": { label: "审核中", visualStatus: "OPEN" },
  "Sign Off": { label: "待签核", visualStatus: "OPEN" },
  Closed: { label: "已关闭", visualStatus: "CLOSED" },
  Cancelled: { label: "已取消", visualStatus: "CLOSED" },
};

export function getActionStatusPresentation(
  status: ParsedActionStatus,
): ActionStatusPresentation {
  return status.kind === "KNOWN"
    ? actionStatusPresentations[status.value]
    : { label: "未知", visualStatus: "UNKNOWN" };
}
