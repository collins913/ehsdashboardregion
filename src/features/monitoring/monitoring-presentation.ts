import type { IncidentStatus, JobExecutionStatus, NotificationStatus, OperationalSeverity } from "@/data/contracts/monitoring";

export const severityLabels: Record<OperationalSeverity, string> = {
  CRITICAL: "严重", ERROR: "错误", WARNING: "警告", INFO: "信息",
};
export const incidentStatusLabels: Record<IncidentStatus, string> = {
  OPEN: "待处理", ACKNOWLEDGED: "已确认", RESOLVED: "已解决",
};
export const notificationStatusLabels: Record<NotificationStatus, string> = {
  PENDING: "待发送", SENDING: "发送中", SENT: "已提交", FAILED: "发送失败",
};
export const jobStatusLabels: Record<JobExecutionStatus, string> = {
  NOT_STARTED: "未启动", RUNNING: "运行中", SUCCEEDED: "成功", FAILED: "失败",
};

export function severityBadgeVariant(severity: OperationalSeverity): "destructive" | "secondary" | "outline" {
  if (severity === "ERROR" || severity === "CRITICAL") return "destructive";
  return severity === "WARNING" ? "secondary" : "outline";
}

export function incidentBadgeVariant(status: IncidentStatus): "destructive" | "secondary" | "outline" {
  return status === "OPEN" ? "destructive" : status === "ACKNOWLEDGED" ? "secondary" : "outline";
}
