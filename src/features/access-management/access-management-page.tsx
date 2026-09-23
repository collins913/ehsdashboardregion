"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AccessCatalog, AccessType, GrantInput, ManualGrant } from "@/data/contracts/access";
import { loadAccessCatalog, loadManualGrants, removeGrant, reviseGrant, submitGrant } from "@/data/server/access-actions";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accessTypeLabels, display, scopeLabel } from "@/features/access-management/access-presentation";
import { AccessAuditTab } from "@/features/access-management/access-audit-page";
import { DataTable, type DataTableColumn, type DataTableInteractionState } from "@/components/shared/data-table";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";

type FormInput = Omit<GrantInput, "accessType"> & { accessType: AccessType | "" };
const emptyInput: FormInput = { email: "", accessType: "", scopeId: null, note: null };
const types: AccessType[] = ["GLOBAL_USER", "GLOBAL_ADMIN", "REGION", "AREA", "STORE"];

function ScopeFields({ value, onChange, catalog }: { value: FormInput; onChange: (value: FormInput) => void; catalog: AccessCatalog }) {
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  useEffect(() => {
    if (!value.scopeId) return;
    const store = catalog.stores.find((item) => item.id === value.scopeId);
    const selectedArea = catalog.areas.find((item) => item.id === value.scopeId || item.id === store?.areaId);
    setRegion(value.accessType === "REGION" ? value.scopeId ?? "" : selectedArea?.regionId ?? "");
    setArea(selectedArea?.id ?? "");
  }, [catalog, value.accessType, value.scopeId]);
  if (!value.accessType || value.accessType.startsWith("GLOBAL")) return null;
  return <div className="space-y-3">
    <label className="block space-y-1 text-sm">区域<Select value={region} onValueChange={(id) => { setRegion(id); setArea(""); onChange({ ...value, scopeId: value.accessType === "REGION" ? id : null }); }}><SelectTrigger className="w-full"><SelectValue placeholder="选择区域" /></SelectTrigger><SelectContent>{catalog.regions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label>
    {value.accessType !== "REGION" ? <label className="block space-y-1 text-sm">小区<Select value={area} onValueChange={(id) => { setArea(id); onChange({ ...value, scopeId: value.accessType === "AREA" ? id : null }); }}><SelectTrigger className="w-full"><SelectValue placeholder="选择小区" /></SelectTrigger><SelectContent>{catalog.areas.filter((item) => item.regionId === region).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label> : null}
    {value.accessType === "STORE" ? <label className="block space-y-1 text-sm">门店<Select value={value.scopeId ?? ""} onValueChange={(id) => onChange({ ...value, scopeId: id })}><SelectTrigger className="w-full"><SelectValue placeholder="选择门店" /></SelectTrigger><SelectContent>{catalog.stores.filter((item) => item.areaId === area).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></label> : null}
  </div>;
}

function GrantDialog({ open, onOpenChange, editing, catalog, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; editing: ManualGrant | null; catalog: AccessCatalog; onSaved: () => Promise<void> }) {
  const [input, setInput] = useState<FormInput>(emptyInput);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setInput(editing ? { email: editing.email, accessType: editing.accessType, scopeId: editing.scopeId, note: editing.note } : emptyInput); setError(""); }, [editing, open]);
  async function save() {
    if (!input.accessType) { setError("请选择权限类型。"); return; }
    setPending(true); setError("");
    try {
      const payload: GrantInput = { ...input, accessType: input.accessType };
      const result = editing ? await reviseGrant(editing.id, { accessType: payload.accessType, scopeId: payload.scopeId, note: payload.note }) : await submitGrant(payload);
      if (!result.ok) { setError(result.message); return; }
      try { await onSaved(); } catch { onOpenChange(false); toast.error("权限已保存，列表刷新失败，请刷新页面。"); return; }
      onOpenChange(false); toast.success(editing ? "权限已更新" : "权限已新增");
    } catch { setError("保存失败，请重试。"); } finally { setPending(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "编辑权限" : "新增权限"}</DialogTitle><DialogDescription>手动授权独立于组织角色自动权限。</DialogDescription></DialogHeader>
    <div className="max-h-[65vh] space-y-3 overflow-y-auto">
      <label className="block space-y-1 text-sm">邮箱<Input type="email" value={input.email} disabled={!!editing} onChange={(event) => setInput({ ...input, email: event.target.value })} /></label>
      <label className="block space-y-1 text-sm">权限类型<Select value={input.accessType} onValueChange={(value) => setInput({ ...input, accessType: value as AccessType, scopeId: null })}><SelectTrigger className="w-full"><SelectValue placeholder="请选择权限类型" /></SelectTrigger><SelectContent>{types.map((type) => <SelectItem key={type} value={type}>{accessTypeLabels[type]}</SelectItem>)}</SelectContent></Select></label>
      {input.accessType ? <><ScopeFields key={`${editing?.id ?? "new"}-${input.accessType}`} value={input} onChange={setInput} catalog={catalog} /><label className="block space-y-1 text-sm">备注（可选）<Input value={input.note ?? ""} onChange={(event) => setInput({ ...input, note: event.target.value || null })} /></label></> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>取消</Button><Button onClick={() => void save()} disabled={pending}>{pending ? "保存中…" : "保存"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function DeleteGrantDialog({ grant, onOpenChange, onDeleted }: { grant: ManualGrant | null; onOpenChange: (open: boolean) => void; onDeleted: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!grant) return;
    setPending(true); setError("");
    try { const result = await removeGrant(grant.id); if (!result.ok) { setError(result.message); return; } try { await onDeleted(); } catch { onOpenChange(false); toast.error("权限已删除，列表刷新失败，请刷新页面。"); return; } onOpenChange(false); toast.success("权限已删除"); }
    catch { setError("删除失败，请重试。"); } finally { setPending(false); }
  }
  return <AlertDialog open={!!grant} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除手动权限</AlertDialogTitle><AlertDialogDescription>{grant?.email} · {grant ? accessTypeLabels[grant.accessType] : ""} · {grant ? scopeLabel(grant) : ""}<br />删除后不会影响该用户通过组织角色自动获得的权限。</AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel disabled={pending}>取消</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); void remove(); }}>{pending ? "删除中…" : "删除"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

export function AccessManagementPage() {
  const { storeScope } = useGlobalFilters();
  const [tab, setTab] = useState("manual");
  const [email, setEmail] = useState("");
  const [accessType, setAccessType] = useState("ALL");
  const [auditEmail, setAuditEmail] = useState("");
  const [visitedAudit, setVisitedAudit] = useState(false);
  const [manualTableState, setManualTableState] = useState<DataTableInteractionState>({ sorting: [], pagination: null });
  const [auditTableState, setAuditTableState] = useState<DataTableInteractionState>({ sorting: [], pagination: null });
  const [catalog, setCatalog] = useState<AccessCatalog>({ regions: [], areas: [], stores: [] });
  const [editing, setEditing] = useState<ManualGrant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<ManualGrant | null>(null);
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => { void loadAccessCatalog().then(setCatalog).catch(() => setCatalogError("权限范围加载失败。")); }, []);
  const manualActive = tab === "manual";
  const manualSemanticKey = JSON.stringify([storeScope, email, accessType]);
  useEffect(() => {
    setManualTableState((current) => ({ ...current, pagination: current.pagination ? { ...current.pagination, pageIndex: 0 } : null }));
  }, [manualSemanticKey]);
  const queryKey = manualActive && storeScope ? manualSemanticKey : null;
  const query = useLatestAsyncQuery(
    queryKey,
    manualActive && storeScope ? () => loadManualGrants({ email, scope: storeScope, accessType }) : null,
  );
  const manuals = query.status === "SUCCESS" ? query.data : query.resolved?.data ?? [];
  const refresh = query.reload;
  const columns = useMemo<DataTableColumn<ManualGrant>[]>(() => [
    { id: "email", title: "邮箱", value: (grant) => grant.email, sizeRole: "primary" },
    { id: "type", title: "权限类型", value: (grant) => accessTypeLabels[grant.accessType], sizeRole: "standard" },
    { id: "scope", title: "权限范围", value: scopeLabel, sizeRole: "standard" },
    { id: "note", title: "备注", value: (grant) => display(grant.note), sizeRole: "content" },
    { id: "actions", title: "操作", value: () => "", sortable: false, sizeRole: "compact", render: (grant) => <div className="whitespace-nowrap"><Button size="sm" variant="ghost" onClick={() => { setEditing(grant); setDialogOpen(true); }}>编辑</Button><Button size="sm" variant="ghost" onClick={() => setDeleting(grant)}>删除</Button></div> },
  ], []);
  return <><PageContainer className="space-y-5"><Tabs value={tab} onValueChange={(value) => { setTab(value); if (value === "audit") setVisitedAudit(true); }}><TabsList><TabsTrigger value="manual">手动权限管理</TabsTrigger><TabsTrigger value="audit">操作日志</TabsTrigger></TabsList>
    <TabsContent forceMount value="manual" className="space-y-4 data-[state=inactive]:hidden"><div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm">邮箱搜索<Input className="w-64" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="输入邮箱" /></label><label className="space-y-1 text-sm">权限类型<Select value={accessType} onValueChange={setAccessType}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部</SelectItem>{types.map((type) => <SelectItem key={type} value={type}>{accessTypeLabels[type]}</SelectItem>)}</SelectContent></Select></label><Button onClick={() => { setEditing(null); setDialogOpen(true); }}>新增权限</Button></div>{catalogError ? <p role="alert" className="text-sm text-destructive">{catalogError}</p> : null}{query.status === "ERROR" ? <p role="alert" className="text-sm text-destructive">查询失败，请重试。</p> : null}<DataTable active={manualActive} interactionState={manualTableState} onInteractionStateChange={setManualTableState} rows={manuals} columns={columns} emptyMessage="没有匹配的手动权限。" status={query.status === "SUCCESS" ? "READY" : query.status === "ERROR" ? "ERROR" : "LOADING"} semanticKey={manualSemanticKey} /></TabsContent>
    <TabsContent forceMount={visitedAudit} value="audit" className="data-[state=inactive]:hidden">{visitedAudit ? <AccessAuditTab active={tab === "audit"} email={auditEmail} onEmailChange={(value) => { setAuditEmail(value); setAuditTableState((current) => ({ ...current, pagination: current.pagination ? { ...current.pagination, pageIndex: 0 } : null })); }} tableState={auditTableState} onTableStateChange={setAuditTableState} /> : null}</TabsContent>
  </Tabs></PageContainer><GrantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} catalog={catalog} onSaved={refresh} /><DeleteGrantDialog grant={deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }} onDeleted={refresh} /></>;
}
