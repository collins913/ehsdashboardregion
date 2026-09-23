"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { AuditEvent, ManualGrant } from "@/data/contracts/access";
import { loadAuditLog } from "@/data/server/access-actions";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, type DataTableColumn, type DataTableInteractionState } from "@/components/shared/data-table";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import { accessTypeLabels, auditActionLabels, display, grantFields } from "@/features/access-management/access-presentation";
import { formatBusinessDateTime } from "@/lib/format-business-date-time";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

function GrantSnapshot({ title, grant }: { title: string; grant: ManualGrant | null }) {
  return <section className="space-y-2"><h3 className="font-semibold">{title}</h3>{grant ? <dl className="grid grid-cols-[6rem_1fr] gap-2 text-sm">{grantFields(grant).map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="break-all">{value}</dd></div>)}</dl> : <p className="text-sm text-muted-foreground">—</p>}</section>;
}

export function AccessAuditTab({ active, email, onEmailChange, tableState, onTableStateChange }: { active: boolean; email: string; onEmailChange: (email: string) => void; tableState: DataTableInteractionState; onTableStateChange: Dispatch<SetStateAction<DataTableInteractionState>> }) {
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const query = useLatestAsyncQuery(active ? email : null, active ? () => loadAuditLog(email) : null);
  const events = query.status === "SUCCESS" ? query.data : query.resolved?.data ?? [];
  const columns = useMemo<DataTableColumn<AuditEvent>[]>(() => [
    { id: "time", title: "时间", value: (event) => event.timestamp, render: (event) => formatBusinessDateTime(event.timestamp), sizeRole: "compact" },
    { id: "action", title: "操作", value: (event) => auditActionLabels[event.action], sizeRole: "compact" },
    { id: "actor", title: "操作人", value: (event) => event.actorEmail, sizeRole: "standard" },
    { id: "target", title: "授权对象", value: (event) => event.targetEmail, sizeRole: "standard" },
    { id: "type", title: "权限类型", value: (event) => accessTypeLabels[event.scopeType], sizeRole: "standard" },
    { id: "scope", title: "权限范围", value: (event) => event.scopeDisplayName, sizeRole: "content" },
    { id: "view", title: "查看", value: () => "", sortable: false, sizeRole: "compact", render: (event) => <TableCellTrigger onClick={() => setSelected(event)}>查看</TableCellTrigger> },
  ], []);
  return <div className="space-y-4"><label className="block w-72 space-y-1 text-sm">邮箱搜索<Input value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="操作人或授权对象" /></label>{query.status === "ERROR" ? <p role="alert" className="text-sm text-destructive">日志加载失败。</p> : null}
    <DataTable active={active} interactionState={tableState} onInteractionStateChange={onTableStateChange} rows={events} columns={columns} emptyMessage="暂无操作日志。" status={query.status === "SUCCESS" ? "READY" : query.status === "ERROR" ? "ERROR" : "LOADING"} semanticKey={email} />
    <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>操作详情</SheetTitle><SheetDescription>手动权限变更记录</SheetDescription></SheetHeader>{selected ? <div className="space-y-5 px-4 pb-5 text-sm"><dl className="grid grid-cols-[6rem_1fr] gap-2">{[["操作", auditActionLabels[selected.action]], ["时间", formatBusinessDateTime(selected.timestamp)], ["操作人", selected.actorEmail], ["授权对象", selected.targetEmail], ["权限类型", accessTypeLabels[selected.scopeType]], ["权限范围", selected.scopeDisplayName], ["备注", display(selected.note)]].map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="break-all">{value}</dd></div>)}</dl><GrantSnapshot title="变更前" grant={selected.before} /><GrantSnapshot title="变更后" grant={selected.after} /></div> : null}</SheetContent></Sheet>
  </div>;
}
