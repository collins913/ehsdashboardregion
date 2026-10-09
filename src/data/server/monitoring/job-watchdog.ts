import "server-only";
import type { JobMonitoringPolicy, JobMonitoringState, OperationalEventInput } from "@/data/contracts/monitoring";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import type { MonitoringRepository } from "@/data/repositories/monitoring/monitoring-repository";
import { recordOperationalEvent, recordVerifiedRecovery } from "./monitoring-service.server";

export interface JobWatchdogFinding {
  errorCode: "JOB_NEVER_STARTED" | "JOB_EXECUTION_FAILED" | "JOB_EXECUTION_TIMEOUT" | "JOB_HEARTBEAT_LOST" | "JOB_SUCCESS_STALE";
  safeMessage: string;
  phenomenon: string;
  actionTaken: string;
  nextStep: string;
}

export function evaluateJobWatchdog(
  policy: JobMonitoringPolicy,
  state: JobMonitoringState | null,
  now: TimezoneAwareIsoDateTime,
): JobWatchdogFinding | null {
  if (!isUsablePolicy(policy)) return null;
  const current = Date.parse(now);
  if (!Number.isFinite(current)) return null;
  if (!state) {
    return current > Date.parse(policy.firstExpectedAt) + policy.allowedDelayMs
      ? { errorCode: "JOB_NEVER_STARTED", safeMessage: `计划任务“${policy.jobName}”未按计划启动。`, phenomenon: "Watchdog 已超过配置的首次启动宽限时间，未收到执行记录。", actionTaken: "已记录任务失联事件。", nextStep: "检查企业调度平台及任务触发配置。" }
      : null;
  }
  if (state.executionStatus === "FAILED") {
    return { errorCode: "JOB_EXECUTION_FAILED", safeMessage: `计划任务“${policy.jobName}”执行失败。`, phenomenon: "任务记录了失败状态。", actionTaken: "已保留执行记录并关联任务故障。", nextStep: "检查任务执行诊断并在调度平台处理。" };
  }
  if (state.executionStatus === "RUNNING") {
    if (current - Date.parse(state.startedAt ?? now) > policy.maxRuntimeMs) {
      return { errorCode: "JOB_EXECUTION_TIMEOUT", safeMessage: `计划任务“${policy.jobName}”超过允许执行时长。`, phenomenon: "任务运行时间超过配置阈值。", actionTaken: "已记录执行超时。", nextStep: "检查任务执行与外部数据源状态。" };
    }
    if (!state.lastHeartbeatAt || current - Date.parse(state.lastHeartbeatAt) > policy.maxHeartbeatAgeMs) {
      return { errorCode: "JOB_HEARTBEAT_LOST", safeMessage: `计划任务“${policy.jobName}”心跳中断。`, phenomenon: "运行中的任务未在配置时限内更新心跳。", actionTaken: "已记录心跳丢失事件。", nextStep: "检查任务进程与 Watchdog 到任务平台的连接。" };
    }
    return null;
  }
  const lastCompleted = state.lastSuccessAt ? Date.parse(state.lastSuccessAt) : Date.parse(state.completedAt ?? state.startedAt ?? policy.firstExpectedAt);
  const anchor = Number.isFinite(lastCompleted) ? lastCompleted : Date.parse(policy.firstExpectedAt);
  return current > anchor + policy.expectedIntervalMs + policy.allowedDelayMs
    ? { errorCode: "JOB_SUCCESS_STALE", safeMessage: `计划任务“${policy.jobName}”长时间没有成功记录。`, phenomenon: "距离上次成功执行已超过配置的执行周期和允许延迟。", actionTaken: "独立 Watchdog 已检测到任务未按计划完成。", nextStep: "检查调度器、任务状态及数据源更新时间。" }
    : null;
}

function isUsablePolicy(policy: JobMonitoringPolicy) {
  return Boolean(policy.jobId.trim() && policy.jobName.trim() && Number.isFinite(Date.parse(policy.firstExpectedAt)) &&
    [policy.expectedIntervalMs, policy.allowedDelayMs, policy.maxRuntimeMs, policy.maxHeartbeatAgeMs].every((value) => Number.isFinite(value) && value >= 0) &&
    policy.expectedIntervalMs > 0 && policy.maxRuntimeMs > 0 && policy.maxHeartbeatAgeMs > 0);
}

export async function runJobWatchdog(
  repository: MonitoringRepository,
  policies: readonly JobMonitoringPolicy[],
  now: TimezoneAwareIsoDateTime,
) {
  if (policies.length === 0) return [];
  const states = await repository.listJobs();
  const byId = new Map(states.map((state) => [state.jobId, state]));
  const findings: Array<{ jobId: string; errorCode: JobWatchdogFinding["errorCode"] }> = [];
  for (const policy of policies) {
    const finding = evaluateJobWatchdog(policy, byId.get(policy.jobId) ?? null, now);
    if (!finding) continue;
    const event: OperationalEventInput = {
      environment: process.env.NODE_ENV ?? "unknown", source: "Scheduled Jobs", component: policy.jobId,
      severity: "ERROR", errorCode: finding.errorCode, safeMessage: finding.safeMessage,
      phenomenon: finding.phenomenon, causeStatus: "UNKNOWN", knownCause: null,
      impact: { kind: "JOB", id: policy.jobId, summary: `受影响任务：${policy.jobName}` },
      actionTaken: finding.actionTaken, nextStep: finding.nextStep, correlationId: byId.get(policy.jobId)?.executionId ?? null,
      relatedBatchId: null, relatedJobId: policy.jobId, relatedDomain: null, diagnostics: [],
    };
    await recordOperationalEvent(event, { repository, now: () => now });
    findings.push({ jobId: policy.jobId, errorCode: finding.errorCode });
  }
  return findings;
}

export async function recordJobExecutionUpdate(repository: MonitoringRepository, update: Parameters<MonitoringRepository["upsertJob"]>[0], now: TimezoneAwareIsoDateTime) {
  const state = await repository.upsertJob(update);
  if (update.executionStatus === "SUCCEEDED") {
    const codes: JobWatchdogFinding["errorCode"][] = ["JOB_NEVER_STARTED", "JOB_EXECUTION_FAILED", "JOB_EXECUTION_TIMEOUT", "JOB_HEARTBEAT_LOST", "JOB_SUCCESS_STALE"];
    for (const errorCode of codes) {
      await recordVerifiedRecovery(repository, {
        source: "Scheduled Jobs", component: update.jobId, errorCode,
        impact: { kind: "JOB", id: update.jobId, summary: `受影响任务：${update.jobName}` },
        signal: `任务 ${update.jobName} 的执行 ${update.executionId} 已成功完成。`, now: () => now,
      });
    }
  }
  return state;
}
