import "server-only";
import type { MonitoringAuditEvent, OperationalEventInput } from "@/data/contracts/monitoring";
import type { MonitoringRepository } from "@/data/repositories/monitoring/monitoring-repository";
import { createMonitoringEventWrite } from "@/data/server/monitoring/operational-event";
import { MemoryMonitoringRepository } from "@/data/server/testing/memory-monitoring-repository";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

const seededRepositories = new WeakSet<MemoryMonitoringRepository>();
const asIso = (date: Date) => date.toISOString() as TimezoneAwareIsoDateTime;

const demoEvents: readonly OperationalEventInput[] = [
  {
    environment: "development-demo", source: "演示模块", component: "门店摘要查询", severity: "ERROR",
    errorCode: "DEMO_STORE_QUERY_TIMEOUT", safeMessage: "【演示数据】门店摘要查询超时。", phenomenon: "【演示数据】门店摘要查询未在预期时间内完成。",
    causeStatus: "UNKNOWN", knownCause: null, impact: { kind: "DOMAIN", id: "stores", summary: "仅用于开发页面演示，不代表真实门店影响。" },
    actionTaken: "演示数据已记录。", nextStep: "根因待确认。", correlationId: "demo-request-store-001",
    relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [{ code: "DEMO_TIMEOUT", severity: "WARNING", message: "这是用于演示详情与复制功能的测试诊断。" }],
  },
  {
    environment: "development-demo", source: "演示模块", component: "通知任务模拟", severity: "WARNING",
    errorCode: "DEMO_NOTIFICATION_RECOVERED", safeMessage: "【演示数据】通知任务曾短暂失败，随后恢复。", phenomenon: "【演示数据】本地演示记录用于查看已处理筛选。",
    causeStatus: "KNOWN", knownCause: "开发演示数据，不代表真实通知服务故障。", impact: { kind: "JOB", id: "demo-notification-job", summary: "仅限本地演示任务范围。" },
    actionTaken: "演示记录已恢复。", nextStep: "无需操作。", correlationId: "demo-request-notify-001",
    relatedBatchId: null, relatedJobId: "demo-notification-job", relatedDomain: null, diagnostics: [],
  },
];

/** Seeds two clearly-labelled local-only incidents so the admin UI can be previewed without production records. */
export async function seedMonitoringDemoData(repository: MonitoringRepository, now = new Date()) {
  if (process.env.NODE_ENV === "production") throw new Error("MONITORING_DEMO_DATA_FORBIDDEN_IN_PRODUCTION");
  if (!(repository instanceof MemoryMonitoringRepository) || seededRepositories.has(repository)) return;

  // Claim before async writes so parallel page requests cannot duplicate demo incidents.
  seededRepositories.add(repository);
  try {
    const firstAt = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const repeatedAt = new Date(now.getTime() - 5 * 60 * 1000);
    const firstWrite = createMonitoringEventWrite(demoEvents[0], asIso(firstAt));
    await repository.recordEvent(firstWrite);
    await repository.recordEvent(createMonitoringEventWrite(demoEvents[0], asIso(repeatedAt)));

    const resolvedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const resolvedWrite = createMonitoringEventWrite(demoEvents[1], asIso(resolvedAt));
    const { incident } = await repository.recordEvent(resolvedWrite);
    const audit: MonitoringAuditEvent = {
      auditId: "demo-recovery-audit", incidentId: incident.incidentId, notificationId: null, jobId: "demo-notification-job",
      operation: "RESOLVE", actorPrincipalId: "system:verified-recovery", occurredAt: asIso(new Date(now.getTime() - 90 * 60 * 1000)),
      outcome: "SUCCEEDED", safeDetail: "仅演示数据：模拟收到恢复信号。", correlationId: null,
    };
    await repository.resolveAfterVerifiedRecovery({
      fingerprint: resolvedWrite.fingerprint,
      at: audit.occurredAt,
      signal: "仅用于开发页面演示的恢复信号。",
      audit,
      notification: null,
    });
  } catch (error) {
    seededRepositories.delete(repository);
    throw error;
  }
}
