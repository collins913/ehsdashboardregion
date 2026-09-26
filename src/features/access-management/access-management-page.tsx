"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AccessCatalog, AccessType, GrantInput, ManualGrant } from "@/data/contracts/access";
import { loadAccessCatalog, loadManualGrants, removeGrant, reviseGrant, submitGrant } from "@/data/server/access-actions";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import { PageContainer } from "@/components/shared/page-container";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
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
import { isValidEmail } from "@/lib/access/access-domain";

type FormInput = Omit<GrantInput, "accessType"> & { accessType: AccessType | ""; regionId: string; areaId: string };
type FieldErrors = Partial<Record<"email" | "accessType" | "regionId" | "areaId" | "scopeId", string>>;
const emptyInput: FormInput = { email: "", accessType: "", scopeId: null, note: null, regionId: "", areaId: "" };
const mutationToastDuration = 4000;
const types: AccessType[] = ["GLOBAL_USER", "GLOBAL_ADMIN", "REGION", "AREA", "STORE"];

function formInputFor(editing: ManualGrant | null, catalog: AccessCatalog): FormInput {
  if (!editing) return emptyInput;
  const store = catalog.stores.find((item) => item.id === editing.scopeId);
  const area = catalog.areas.find((item) => item.id === editing.scopeId || item.id === store?.areaId);
  return {
    email: editing.email,
    accessType: editing.accessType,
    scopeId: editing.scopeId,
    note: editing.note,
    regionId: editing.accessType === "REGION" ? editing.scopeId ?? "" : area?.regionId ?? store?.regionId ?? "",
    areaId: editing.accessType === "AREA" ? editing.scopeId ?? "" : area?.id ?? store?.areaId ?? "",
  };
}

function mutationErrorMessage(code: string, action: "save" | "delete") {
  if (code === "NOT_AUTHORIZED") return "你没有权限执行此操作";
  if (code === "LAST_GLOBAL_ADMIN") return "至少需要保留一名全局管理员";
  if (code === "INVALID_INPUT" || code === "EMAIL_REQUIRED" || code === "INVALID_EMAIL") return "提交内容无效，请检查后重试";
  if (code === "INVALID_SCOPE") return "请选择有效权限范围";
  if (code === "DUPLICATE_GRANT") return "该权限已存在";
  if (code === "GRANT_NOT_FOUND") return "该权限不存在";
  return action === "delete" ? "删除失败，请重试" : "保存失败，请重试";
}

function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} className="text-sm text-destructive">{children}</p> : null;
}

function ScopeFields({ value, onChange, catalog, errors, clearError }: { value: FormInput; onChange: (value: FormInput) => void; catalog: AccessCatalog; errors: FieldErrors; clearError: (field: keyof FieldErrors) => void }) {
  if (!value.accessType || value.accessType.startsWith("GLOBAL")) return null;
  return <div className="space-y-3">
    <label className="block space-y-1 text-sm">区域<Select value={value.regionId} onValueChange={(id) => { clearError("regionId"); clearError("areaId"); clearError("scopeId"); onChange({ ...value, regionId: id, areaId: "", scopeId: value.accessType === "REGION" ? id : null }); }}><SelectTrigger id="grant-region" aria-invalid={!!errors.regionId} aria-describedby={errors.regionId ? "grant-region-error" : undefined} className="w-full"><SelectValue placeholder="选择区域" /></SelectTrigger><SelectContent>{catalog.regions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FieldError id="grant-region-error">{errors.regionId}</FieldError></label>
    {value.accessType !== "REGION" ? <label className="block space-y-1 text-sm">小区<Select value={value.areaId} onValueChange={(id) => { clearError("areaId"); clearError("scopeId"); onChange({ ...value, areaId: id, scopeId: value.accessType === "AREA" ? id : null }); }}><SelectTrigger id="grant-area" aria-invalid={!!errors.areaId} aria-describedby={errors.areaId ? "grant-area-error" : undefined} className="w-full"><SelectValue placeholder="选择小区" /></SelectTrigger><SelectContent>{catalog.areas.filter((item) => item.regionId === value.regionId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FieldError id="grant-area-error">{errors.areaId}</FieldError></label> : null}
    {value.accessType === "STORE" ? <label className="block space-y-1 text-sm">门店<Select value={value.scopeId ?? ""} onValueChange={(id) => { clearError("scopeId"); onChange({ ...value, scopeId: id }); }}><SelectTrigger id="grant-store" aria-invalid={!!errors.scopeId} aria-describedby={errors.scopeId ? "grant-store-error" : undefined} className="w-full"><SelectValue placeholder="选择门店" /></SelectTrigger><SelectContent>{catalog.stores.filter((item) => item.areaId === value.areaId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FieldError id="grant-store-error">{errors.scopeId}</FieldError></label> : null}
  </div>;
}

function GrantDialog({ open, onOpenChange, editing, catalog, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; editing: ManualGrant | null; catalog: AccessCatalog; onSaved: () => Promise<void> }) {
  const [input, setInput] = useState<FormInput>(emptyInput);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const pendingRef = useRef(false);
  const clearError = (field: keyof FieldErrors) => setErrors((current) => ({ ...current, [field]: undefined }));
  useEffect(() => { if (!open) return; setInput(formInputFor(editing, catalog)); setErrors({}); }, [editing, open]);
  async function save() {
    if (pendingRef.current) return;
    const nextErrors: FieldErrors = {};
    if (!editing && !input.email.trim()) nextErrors.email = "请输入邮箱";
    else if (!editing && !isValidEmail(input.email)) nextErrors.email = "请输入有效的邮箱地址";
    if (!input.accessType) nextErrors.accessType = "请选择权限类型";
    if (input.accessType === "REGION" && !input.regionId) nextErrors.regionId = "请选择区域";
    if ((input.accessType === "AREA" || input.accessType === "STORE") && !input.regionId) nextErrors.regionId = "请选择区域";
    if ((input.accessType === "AREA" || input.accessType === "STORE") && input.regionId && !input.areaId) nextErrors.areaId = "请选择小区";
    if (input.accessType === "STORE" && input.regionId && input.areaId && !input.scopeId) nextErrors.scopeId = "请选择门店";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    pendingRef.current = true;
    setPending(true);
    const toastId = toast.loading("正在保存…", { duration: Infinity });
    try {
      const payload: GrantInput = { email: input.email, accessType: input.accessType as AccessType, scopeId: input.scopeId, note: input.note };
      const result = editing ? await reviseGrant(editing.id, { accessType: payload.accessType, scopeId: payload.scopeId, note: payload.note }) : await submitGrant(payload);
      if (!result.ok) { toast.error(mutationErrorMessage(result.code, "save"), { id: toastId, duration: mutationToastDuration }); return; }
      try { await onSaved(); } catch { onOpenChange(false); toast.error("权限已保存，但列表刷新失败，请刷新页面", { id: toastId, duration: mutationToastDuration }); return; }
      onOpenChange(false); toast.success(editing ? "权限已更新" : "权限已新增", { id: toastId, duration: mutationToastDuration });
    } catch { toast.error("保存失败，请重试", { id: toastId, duration: mutationToastDuration }); } finally { pendingRef.current = false; setPending(false); }
  }
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "编辑权限" : "新增权限"}</DialogTitle><DialogDescription>手动授权独立于组织角色自动权限。</DialogDescription></DialogHeader>
    <div className="max-h-[65vh] space-y-3 overflow-y-auto">
      <label className="block space-y-1 text-sm">邮箱<Input id="grant-email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "grant-email-error" : undefined} type="email" value={input.email} disabled={!!editing} onChange={(event) => { clearError("email"); setInput({ ...input, email: event.target.value }); }} placeholder={editing ? undefined : "name@example.com"} /><FieldError id="grant-email-error">{errors.email}</FieldError></label>
      <label className="block space-y-1 text-sm">权限类型<Select value={input.accessType} onValueChange={(value) => { setErrors((current) => ({ email: current.email })); setInput({ ...input, accessType: value as AccessType, scopeId: null, regionId: "", areaId: "" }); }}><SelectTrigger id="grant-access-type" aria-invalid={!!errors.accessType} aria-describedby={errors.accessType ? "grant-access-type-error" : undefined} className="w-full"><SelectValue placeholder="请选择权限类型" /></SelectTrigger><SelectContent>{types.map((type) => <SelectItem key={type} value={type}>{accessTypeLabels[type]}</SelectItem>)}</SelectContent></Select><FieldError id="grant-access-type-error">{errors.accessType}</FieldError></label>
      {input.accessType ? <><ScopeFields key={`${editing?.id ?? "new"}-${input.accessType}`} value={input} onChange={setInput} catalog={catalog} errors={errors} clearError={clearError} /><label className="block space-y-1 text-sm">备注（可选）<Input value={input.note ?? ""} onChange={(event) => setInput({ ...input, note: event.target.value || null })} /></label></> : null}
    </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>取消</Button><Button onClick={() => void save()} disabled={pending}>保存</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function DeleteGrantDialog({ grant, onOpenChange, onDeleted }: { grant: ManualGrant | null; onOpenChange: (open: boolean) => void; onDeleted: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  async function remove() {
    if (!grant || pendingRef.current) return;
    pendingRef.current = true; setPending(true);
    const toastId = toast.loading("正在删除…", { duration: Infinity });
    try {
      const result = await removeGrant(grant.id);
      if (!result.ok) { toast.error(mutationErrorMessage(result.code, "delete"), { id: toastId, duration: mutationToastDuration }); return; }
      try { await onDeleted(); } catch { onOpenChange(false); toast.error("权限已删除，但列表刷新失败，请刷新页面", { id: toastId, duration: mutationToastDuration }); return; }
      onOpenChange(false);
      toast.success("权限已删除", { id: toastId, duration: mutationToastDuration });
    } catch { toast.error("删除失败，请重试", { id: toastId, duration: mutationToastDuration }); } finally { pendingRef.current = false; setPending(false); }
  }
  return <AlertDialog open={!!grant} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除手动权限</AlertDialogTitle><AlertDialogDescription>{grant?.email} · {grant ? accessTypeLabels[grant.accessType] : ""} · {grant ? scopeLabel(grant) : ""}<br />删除后不会影响该用户通过组织角色自动获得的权限。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>取消</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); void remove(); }}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
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
    { id: "actions", title: "操作", value: () => "", sortable: false, sizeRole: "compact", render: (grant) => <div className="whitespace-nowrap"><TableCellTrigger onClick={() => { setEditing(grant); setDialogOpen(true); }}>编辑</TableCellTrigger><TableCellTrigger onClick={() => setDeleting(grant)}>删除</TableCellTrigger></div> },
  ], []);
  return <><PageContainer className="space-y-5"><Tabs value={tab} onValueChange={(value) => { setTab(value); if (value === "audit") setVisitedAudit(true); }}><TabsList><TabsTrigger value="manual">手动权限管理</TabsTrigger><TabsTrigger value="audit">操作日志</TabsTrigger></TabsList>
    <TabsContent forceMount value="manual" className="space-y-4 data-[state=inactive]:hidden"><div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm">邮箱搜索<Input className="w-64" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="输入邮箱" /></label><label className="space-y-1 text-sm">权限类型<Select value={accessType} onValueChange={setAccessType}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部</SelectItem>{types.map((type) => <SelectItem key={type} value={type}>{accessTypeLabels[type]}</SelectItem>)}</SelectContent></Select></label><Button onClick={() => { setEditing(null); setDialogOpen(true); }}>新增权限</Button></div>{catalogError ? <p role="alert" className="text-sm text-destructive">{catalogError}</p> : null}{query.status === "ERROR" ? <p role="alert" className="text-sm text-destructive">查询失败，请重试。</p> : null}<DataTable active={manualActive} interactionState={manualTableState} onInteractionStateChange={setManualTableState} rows={manuals} columns={columns} emptyMessage="没有匹配的手动权限。" status={query.status === "SUCCESS" ? "READY" : query.status === "ERROR" ? "ERROR" : "LOADING"} semanticKey={manualSemanticKey} /></TabsContent>
    <TabsContent forceMount={visitedAudit ? true : undefined} value="audit" className="data-[state=inactive]:hidden">{visitedAudit ? <AccessAuditTab active={tab === "audit"} email={auditEmail} onEmailChange={(value) => { setAuditEmail(value); setAuditTableState((current) => ({ ...current, pagination: current.pagination ? { ...current.pagination, pageIndex: 0 } : null })); }} tableState={auditTableState} onTableStateChange={setAuditTableState} /> : null}</TabsContent>
  </Tabs></PageContainer><GrantDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} catalog={catalog} onSaved={refresh} /><DeleteGrantDialog grant={deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }} onDeleted={refresh} /></>;
}
