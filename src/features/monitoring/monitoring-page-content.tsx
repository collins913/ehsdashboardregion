"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { MonitoringQuery, MonitoringSnapshot, OperationalEvent, OperationalIncident } from "@/data/contracts/monitoring";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";
import { loadMonitoringSnapshot, reopenMonitoringIncident, resolveMonitoringIncident } from "@/data/server/monitoring-actions";
import { DataTable, type DataTableColumn, type DataTableInteractionState } from "@/components/shared/data-table";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DetailHeader } from "@/components/shared/detail-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FilterSelect } from "@/components/shared/filter-select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

type TimeWindow = "24h" | "7d" | "30d" | "all";
type IncidentRow = OperationalIncident & { id: string };
const defaultSnapshot: MonitoringSnapshot = { incidents: [], events: [], notifications: [], jobs: [], audit: [], sampledAt: new Date(0).toISOString() as MonitoringSnapshot["sampledAt"] };

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
}

export function buildIncidentDiagnostics(incident: OperationalIncident, events: readonly OperationalEvent[]) {
  return {
    incident: {
      incidentId: incident.incidentId,
      source: incident.source,
      component: incident.component,
      severity: incident.severity,
      errorCode: incident.errorCode,
      summary: incident.summary,
      causeStatus: incident.causeStatus,
      knownCause: incident.knownCause,
      impact: incident.impact,
      status: incident.status,
      firstOccurredAt: incident.firstOccurredAt,
      lastOccurredAt: incident.lastOccurredAt,
      resolvedAt: incident.resolvedAt,
    },
    diagnosticDetails: events.filter((event) => event.incidentId === incident.incidentId).map((event) => ({
      eventId: event.eventId,
      occurredAt: event.occurredAt,
      environment: event.environment,
      source: event.source,
      component: event.component,
      severity: event.severity,
      errorCode: event.errorCode,
      safeMessage: event.safeMessage,
      phenomenon: event.phenomenon,
      causeStatus: event.causeStatus,
      knownCause: event.knownCause,
      impact: event.impact,
      actionTaken: event.actionTaken,
      nextStep: event.nextStep,
      correlationId: event.correlationId,
      diagnostics: event.diagnostics,
    })),
  };
}

export function MonitoringPageContent({ initialSnapshot, storageMode }: { initialSnapshot: MonitoringSnapshot; storageMode: "DEVELOPMENT_MEMORY" | "PRODUCTION" | "UNAVAILABLE" }) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("7d");
  const [windowClock, setWindowClock] = useState(() => Date.now());
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [pendingIncidentId, setPendingIncidentId] = useState<string | null>(null);
  const [tableState, setTableState] = useState<DataTableInteractionState>({ sorting: [{ id: "lastOccurredAt", desc: true }], pagination: null });

  const query = useMemo<MonitoringQuery>(() => {
    const until = new Date(windowClock).toISOString() as TimezoneAwareIsoDateTime;
    const duration = timeWindow === "24h" ? 24 * 60 * 60 * 1000 : timeWindow === "7d" ? 7 * 24 * 60 * 60 * 1000 : timeWindow === "30d" ? 30 * 24 * 60 * 60 * 1000 : null;
    return { ...(duration ? { since: new Date(windowClock - duration).toISOString() as TimezoneAwareIsoDateTime } : {}), ...(timeWindow === "all" ? {} : { until }), limit: 200 };
  }, [timeWindow, windowClock]);
  const queryKey = JSON.stringify({ timeWindow, windowClock, query });
  const load = useCallback(() => loadMonitoringSnapshot(query), [query]);
  const queryState = useLatestAsyncQuery(queryKey, load);
  const snapshot = queryState.status === "SUCCESS" ? queryState.data : queryState.resolved?.data ?? initialSnapshot ?? defaultSnapshot;
  const selectedIncident = snapshot.incidents.find((incident) => incident.incidentId === selectedIncidentId) ?? null;
  const relatedEvents = selectedIncident ? snapshot.events.filter((event) => event.incidentId === selectedIncident.incidentId) : [];

  const setIncidentProcessed = useCallback(async (incident: OperationalIncident, processed: boolean) => {
    if (pendingIncidentId !== null || (incident.status === "RESOLVED") === processed) return;
    setPendingIncidentId(incident.incidentId);
    try {
      if (processed) {
        await resolveMonitoringIncident({
          incidentId: incident.incidentId,
          expectedRevision: incident.revision,
          note: "管理员通过系统监控标记为已处理。",
        });
        toast.success("报错已切换为已处理");
      } else {
        await reopenMonitoringIncident({ incidentId: incident.incidentId, expectedRevision: incident.revision });
        toast.success("报错已切换为未处理");
      }
      await queryState.reload();
    } catch {
      toast.error("处理状态更新失败，请刷新后重试");
    } finally {
      setPendingIncidentId(null);
    }
  }, [pendingIncidentId, queryState.reload]);

  const incidentColumns = useMemo<DataTableColumn<IncidentRow>[]>(() => [
    { id: "lastOccurredAt", title: "最近报错时间", value: (row) => formatTime(row.lastOccurredAt), sortValue: (row) => Date.parse(row.lastOccurredAt), sizeRole: "standard", render: (row) => <span className="whitespace-normal break-words leading-5 sm:whitespace-nowrap">{formatTime(row.lastOccurredAt)}</span> },
    { id: "summary", title: "报错内容", value: (row) => row.summary, sizeRole: "content", render: (row) => <span className="whitespace-normal break-words leading-5 sm:whitespace-nowrap">{row.summary}</span> },
    { id: "occurrenceCount", title: "发生次数", value: (row) => String(row.occurrenceCount), sortValue: (row) => row.occurrenceCount, sizeRole: "compact" },
  ], []);

  const refresh = () => setWindowClock(Date.now());
  const copyDiagnostics = async () => {
    if (!selectedIncident) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildIncidentDiagnostics(selectedIncident, relatedEvents), null, 2));
      toast.success("诊断信息已复制");
    } catch {
      toast.error("复制失败，请检查浏览器剪贴板权限");
    }
  };

  return <>
    <PageContainer className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect<TimeWindow>
            ariaLabel="监控时间范围"
            className="w-[150px]"
            value={timeWindow}
            onValueChange={setTimeWindow}
            options={[
              { value: "24h", label: "近 24 小时" },
              { value: "7d", label: "近 7 天" },
              { value: "30d", label: "近 30 天" },
              { value: "all", label: "全部时间" },
            ]}
          />
          <Button variant="outline" onClick={refresh} disabled={queryState.status === "LOADING"}>刷新</Button>
          {storageMode === "DEVELOPMENT_MEMORY" ? <span className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">开发模式 · 含 2 条演示记录</span> : null}
        </div>
      </div>

      {storageMode === "UNAVAILABLE" ? <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">监控服务尚未配置</p>
        <p className="mt-1 text-muted-foreground">当前无法读取错误记录。</p>
      </div> : <section aria-labelledby="incident-list-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="incident-list-title" className="text-base font-semibold">错误记录</h2>
        </div>
        {queryState.status === "ERROR" && !queryState.resolved ? <AsyncQueryFeedback status="ERROR" errorCode={queryState.errorCode} /> : <>
          {queryState.status === "ERROR" ? <AsyncQueryFeedback status="ERROR" errorCode={queryState.errorCode} /> : null}
          <DataTable
          rows={snapshot.incidents.map((incident) => ({ ...incident, id: incident.incidentId }))}
          columns={incidentColumns}
          emptyMessage="当前时间范围内暂无报错"
          status={queryState.status === "LOADING" ? "LOADING" : "READY"}
          semanticKey={queryKey}
          compactOnMobile
          interactionState={tableState}
          onInteractionStateChange={setTableState}
          onRowClick={(incident) => setSelectedIncidentId(incident.incidentId)}
          rowAriaLabel={(incident) => `查看错误代码 ${incident.errorCode} 的详情`}
          />
        </>}
      </section>}
    </PageContainer>

    <Sheet open={selectedIncidentId !== null} onOpenChange={(open) => { if (!open) setSelectedIncidentId(null); }}>
      <SheetContent className="gap-0 overflow-y-auto p-0" mobileWidth="full">
        {selectedIncident ? <>
          <DetailHeader title="报错详情" subtitle={`Incident ID：${selectedIncident.incidentId}`} />
          <div className="space-y-4 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="min-w-0 space-y-1"><dt className="text-xs text-muted-foreground">错误代码</dt><dd className="break-all font-mono text-sm">{selectedIncident.errorCode}</dd></div>
              <div className="space-y-1"><dt className="text-xs text-muted-foreground">处理状态</dt><dd className="text-sm">{selectedIncident.status === "RESOLVED" ? "已处理" : "未处理"}</dd></div>
              <div className="space-y-1"><dt className="text-xs text-muted-foreground">处理时间</dt><dd className="text-sm">{selectedIncident.resolvedAt ? formatTime(selectedIncident.resolvedAt) : "—"}</dd></div>
            </dl>
            <Switch
              checked={selectedIncident.status === "RESOLVED"}
              disabled={pendingIncidentId !== null}
              aria-label={`${selectedIncident.errorCode} 是否已处理`}
              onCheckedChange={(checked) => void setIncidentProcessed(selectedIncident, checked)}
            />
            <Button onClick={() => void copyDiagnostics()} size="sm">复制诊断信息</Button>
            <section className="space-y-2 border-t pt-3" aria-labelledby="diagnostics-title">
              <h3 id="diagnostics-title" className="text-sm font-medium">诊断明细</h3>
              {relatedEvents.length > 0 ? <pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"><code>{JSON.stringify(buildIncidentDiagnostics(selectedIncident, relatedEvents).diagnosticDetails, null, 2)}</code></pre> : <pre className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground"><code>暂无诊断明细</code></pre>}
            </section>
          </div>
        </> : <DetailHeader title="报错详情" subtitle="此记录不在当前时间范围内，请扩大时间范围后重试。" />}
      </SheetContent>
    </Sheet>
  </>;
}
