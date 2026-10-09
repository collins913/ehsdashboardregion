import "server-only";
import type { JobMonitoringPolicy, OperationalEventInput } from "@/data/contracts/monitoring";
import type { MonitoringRepository } from "@/data/repositories/monitoring/monitoring-repository";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import { getMonitoringRepository } from "./monitoring-runtime.server";
import { createConfiguredEmailNotificationProvider } from "./notification-provider.server";
import { dispatchNotificationOutbox, recordOperationalEvent } from "./monitoring-service.server";
import { runJobWatchdog } from "./job-watchdog";

const isoNow = () => new Date().toISOString() as TimezoneAwareIsoDateTime;

export function parseJobMonitoringConfiguration(raw: string | undefined): readonly JobMonitoringPolicy[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("INVALID_JOB_MONITORING_CONFIGURATION"); }
  if (!Array.isArray(parsed) || parsed.length > 50) throw new Error("INVALID_JOB_MONITORING_CONFIGURATION");
  const policies: JobMonitoringPolicy[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("INVALID_JOB_MONITORING_CONFIGURATION");
    const value = row as Record<string, unknown>;
    if (Object.keys(value).some((key) => !["jobId", "jobName", "firstExpectedAt", "expectedIntervalMs", "allowedDelayMs", "maxRuntimeMs", "maxHeartbeatAgeMs"].includes(key)) ||
        typeof value.jobId !== "string" || !/^[A-Za-z0-9._:-]{1,120}$/.test(value.jobId) ||
        typeof value.jobName !== "string" || value.jobName.trim().length < 1 || value.jobName.length > 160 ||
        typeof value.firstExpectedAt !== "string" || !Number.isFinite(Date.parse(value.firstExpectedAt)) ||
        ![value.expectedIntervalMs, value.allowedDelayMs, value.maxRuntimeMs, value.maxHeartbeatAgeMs].every((number) => typeof number === "number" && Number.isSafeInteger(number) && number >= 0) ||
        !Number.isSafeInteger(value.expectedIntervalMs) || Number(value.expectedIntervalMs) < 1 ||
        !Number.isSafeInteger(value.maxRuntimeMs) || Number(value.maxRuntimeMs) < 1 ||
        !Number.isSafeInteger(value.maxHeartbeatAgeMs) || Number(value.maxHeartbeatAgeMs) < 1) {
      throw new Error("INVALID_JOB_MONITORING_CONFIGURATION");
    }
    policies.push({
      jobId: value.jobId, jobName: value.jobName.trim(), firstExpectedAt: value.firstExpectedAt as TimezoneAwareIsoDateTime,
      expectedIntervalMs: value.expectedIntervalMs as number, allowedDelayMs: value.allowedDelayMs as number,
      maxRuntimeMs: value.maxRuntimeMs as number, maxHeartbeatAgeMs: value.maxHeartbeatAgeMs as number,
    });
  }
  return policies;
}

/** Called by a company scheduler. The repository has no built-in schedule and an empty configuration is a no-op. */
export async function runConfiguredJobWatchdog(now: TimezoneAwareIsoDateTime = isoNow()) {
  try {
    const policies = parseJobMonitoringConfiguration(process.env.EHS_MONITORING_JOBS);
    if (policies.length === 0) return [];
    return await runJobWatchdog(getMonitoringRepository(), policies, now);
  } catch {
    await recordOperationalEvent(workerFailure("JOB_WATCHDOG_FAILED", "Scheduled Jobs", "独立 Watchdog 未能完成任务检查。", "检查 Watchdog 配置、监控存储及外部调度器。"));
    throw new Error("JOB_WATCHDOG_FAILED");
  }
}

/** Called by an external worker. Missing storage/provider stays an explicit integration failure. */
export async function runConfiguredNotificationWorker(now: () => TimezoneAwareIsoDateTime = isoNow) {
  let repository: MonitoringRepository | undefined;
  try {
    repository = getMonitoringRepository();
    const provider = createConfiguredEmailNotificationProvider();
    return await dispatchNotificationOutbox(repository, provider, { now });
  } catch {
    await recordOperationalEvent(workerFailure("NOTIFICATION_WORKER_FAILED", "Notification", "通知队列处理未能完成。", "检查监控存储、企业通知 Adapter 及 Worker 运行状态。"), { ...(repository ? { repository } : {}) });
    throw new Error("NOTIFICATION_WORKER_FAILED");
  }
}

function workerFailure(errorCode: string, source: string, phenomenon: string, nextStep: string): OperationalEventInput {
  return {
    environment: process.env.NODE_ENV ?? "unknown", source, component: source === "Notification" ? "Notification Worker" : "Watchdog",
    severity: "ERROR", errorCode, safeMessage: source === "Notification" ? "通知队列处理失败。" : "任务监控检查失败。",
    phenomenon, causeStatus: "UNKNOWN", knownCause: null,
    impact: { kind: "SYSTEM", id: source.toLowerCase(), summary: source === "Notification" ? "通知队列暂时无法处理。" : "任务失联状态暂时无法核验。" },
    actionTaken: "已保留安全诊断；未向日志或通知写入原始异常内容。", nextStep,
    correlationId: null, relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [],
  };
}
