import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/server/monitoring-actions", () => ({ loadMonitoringSnapshot: vi.fn(), resolveMonitoringIncident: vi.fn() }));

import type { OperationalEvent, OperationalIncident } from "@/data/contracts/monitoring";
import { buildIncidentDiagnostics, filterMonitoringIncidents } from "./monitoring-page-content";

describe("monitoring incident diagnostics presentation", () => {
  it("copies the selected incident and only its linked safe event diagnostics", () => {
    const incident = {
      incidentId: "incident-1", fingerprint: "fingerprint-1", severity: "ERROR", status: "OPEN",
      errorCode: "REPOSITORY_QUERY_FAILED", summary: "查询失败", firstOccurredAt: "2026-10-08T00:00:00.000Z",
      lastOccurredAt: "2026-10-09T00:00:00.000Z", occurrenceCount: 2, source: "Repository", component: "查询",
      causeStatus: "UNKNOWN", knownCause: null, impact: { kind: "SYSTEM", id: null, summary: "系统范围异常" },
      relatedEvents: ["event-1"], relatedRequestIds: ["request-1"], relatedBatchIds: [], relatedJobIds: [],
      acknowledgedAt: null, acknowledgedBy: null, lastNotifiedAt: null, resolvedAt: null, resolvedBy: null,
      resolutionNote: null, recoverySignal: null, revision: 1,
    } as OperationalIncident;
    const linked = {
      eventId: "event-1", incidentId: "incident-1", fingerprint: "fingerprint-1", occurredAt: "2026-10-09T00:00:00.000Z",
      environment: "test", source: "Repository", component: "查询", severity: "ERROR", errorCode: "REPOSITORY_QUERY_FAILED",
      safeMessage: "安全摘要", phenomenon: "查询失败", causeStatus: "UNKNOWN", knownCause: null,
      impact: { kind: "SYSTEM", id: null, summary: "系统范围异常" }, actionTaken: "已记录", nextStep: "检查数据源",
      correlationId: "request-1", relatedBatchId: null, relatedJobId: null, relatedDomain: null,
      diagnostics: [{ code: "DB_TIMEOUT", severity: "ERROR", message: "连接超时" }],
    } as OperationalEvent;
    const unrelated = { ...linked, eventId: "event-2", incidentId: "incident-2" } as OperationalEvent;

    const result = buildIncidentDiagnostics(incident, [linked, unrelated]);

    expect(result.incident).toMatchObject({ incidentId: "incident-1", errorCode: "REPOSITORY_QUERY_FAILED", status: "OPEN", resolvedAt: null });
    expect(result.diagnosticDetails).toHaveLength(1);
    expect(result.diagnosticDetails[0]).toMatchObject({ eventId: "event-1", occurredAt: "2026-10-09T00:00:00.000Z", diagnostics: [{ code: "DB_TIMEOUT" }] });
    expect(JSON.stringify(result)).not.toContain("event-2");
  });

  it("filters processed and unprocessed incidents", () => {
    const incidents = [
      { incidentId: "open", status: "OPEN" },
      { incidentId: "acknowledged", status: "ACKNOWLEDGED" },
      { incidentId: "resolved", status: "RESOLVED" },
    ] as unknown as OperationalIncident[];

    expect(filterMonitoringIncidents(incidents, "UNPROCESSED").map(({ incidentId }) => incidentId)).toEqual(["open", "acknowledged"]);
    expect(filterMonitoringIncidents(incidents, "PROCESSED").map(({ incidentId }) => incidentId)).toEqual(["resolved"]);
  });
});
