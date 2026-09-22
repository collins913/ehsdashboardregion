import "server-only";
import type { AccessCatalog, AccessQuery, AccountSummary, AuditEvent, GrantInput, GrantUpdate, ManualGrant, MutationResult } from "@/data/contracts/access";
import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi";
import { getMockDataset } from "@/data/mock/mock-dataset";
import { resolveMockProfile } from "@/data/mock/mock-profile.server";
import { toKpiStore } from "@/data/normalize-store-master";
import { getCurrentIdentity } from "@/data/repositories/access/mock-identity.server";
import { mockAccessRepository } from "@/data/repositories/access/mock-access-repository.server";
import { accountSummary, areaScopeId, authorizedScope, canonicalEmail, deriveBaseGrants, grantMatchesScope, isValidEmail, resolveEffectiveAccess } from "@/lib/access/access-domain";

function catalog(now: Date) {
  const source = getMockDataset(resolveMockProfile(), now).stores;
  return { source, stores: source.map(toKpiStore) };
}
export async function currentAccess(now = new Date()) {
  const { source, stores } = catalog(now);
  const manuals = await mockAccessRepository.listManualGrants();
  const identity = getCurrentIdentity();
  return { identity, stores, bases: deriveBaseGrants(source), manuals, effective: resolveEffectiveAccess(identity.email, deriveBaseGrants(source), manuals, stores) };
}
export async function requireAdmin() {
  const context = await currentAccess();
  if (!context.effective.canManageAccess) throw new Error("NOT_AUTHORIZED");
  return context;
}
export async function getAccountSummary(): Promise<AccountSummary> {
  return accountSummary((await currentAccess()).effective);
}
export async function getAuthorizedFilterStores(): Promise<readonly KpiStore[]> {
  const { stores, effective } = await currentAccess();
  return stores.filter((store) => effective.allowedStoreIds.includes(store.storeId));
}
export async function authorizeBusinessScope(requested: EhsStoreScope): Promise<EhsStoreScope> {
  const { stores, effective } = await currentAccess();
  const scope = authorizedScope(requested, effective, stores);
  if (!scope) throw new Error("NOT_AUTHORIZED");
  return scope;
}
function scopeName(input: GrantUpdate, stores: readonly KpiStore[]): string | null {
  if (!["GLOBAL_ADMIN", "GLOBAL_USER", "REGION", "AREA", "STORE"].includes(input.accessType)) return null;
  if (input.accessType === "GLOBAL_ADMIN" || input.accessType === "GLOBAL_USER") return input.scopeId === null ? "全部" : null;
  if (!input.scopeId) return null;
  if (input.accessType === "REGION") return stores.find((store) => store.region === input.scopeId)?.region ?? null;
  if (input.accessType === "AREA") return stores.find((store) => areaScopeId(store.region, store.area) === input.scopeId)?.area ?? null;
  return stores.find((store) => store.storeId === input.scopeId)?.displayName ?? null;
}
function failure(code: "EMAIL_REQUIRED" | "INVALID_EMAIL" | "DUPLICATE_GRANT" | "INVALID_SCOPE" | "LAST_GLOBAL_ADMIN" | "NOT_AUTHORIZED" | "GRANT_NOT_FOUND" | "WRITE_FAILED"): MutationResult<never> {
  const messages = { EMAIL_REQUIRED: "请输入邮箱。", INVALID_EMAIL: "邮箱格式无效。", DUPLICATE_GRANT: "该权限已存在。", INVALID_SCOPE: "请选择有效权限范围。", LAST_GLOBAL_ADMIN: "系统必须至少保留一名全局管理员，请先配置其他全局管理员。", NOT_AUTHORIZED: "当前账号无权管理权限。", GRANT_NOT_FOUND: "该权限不存在。", WRITE_FAILED: "保存失败，请重试。" };
  return { ok: false, code, message: messages[code] };
}
function validInput(input: GrantUpdate, stores: readonly KpiStore[]): string | null { return scopeName(input, stores); }
export async function listManualGrants(query: AccessQuery & { accessType?: string } = {}): Promise<readonly ManualGrant[]> {
  const { manuals, stores } = await requireAdmin();
  return manuals.filter((grant) => (!query.email || grant.email.includes(canonicalEmail(query.email))) && (!query.accessType || query.accessType === "ALL" || grant.accessType === query.accessType) && grantMatchesScope(grant, query.scope, stores));
}
function removesLastGlobalAdmin(before: ManualGrant, nextType: GrantUpdate["accessType"] | null, manuals: readonly ManualGrant[]): boolean {
  return before.accessType === "GLOBAL_ADMIN" && nextType !== "GLOBAL_ADMIN" && !manuals.some((grant) => grant.id !== before.id && grant.accessType === "GLOBAL_ADMIN");
}
export async function createManualGrant(input: GrantInput): Promise<MutationResult<string>> {
  try {
    const { identity, stores, manuals } = await requireAdmin();
    const email = canonicalEmail(input.email);
    if (!email) return failure("EMAIL_REQUIRED");
    if (!isValidEmail(email)) return failure("INVALID_EMAIL");
    const name = validInput(input, stores);
    if (!name) return failure("INVALID_SCOPE");
    if (manuals.some((grant) => grant.email === email && grant.accessType === input.accessType && grant.scopeId === input.scopeId)) return failure("DUPLICATE_GRANT");
    const created = await mockAccessRepository.createManualGrant({ ...input, email }, identity.email, name);
    return { ok: true, value: created.id };
  } catch (error) { return failure(error instanceof Error && error.message === "NOT_AUTHORIZED" ? "NOT_AUTHORIZED" : "WRITE_FAILED"); }
}
export async function updateManualGrant(id: string, input: GrantUpdate): Promise<MutationResult<string>> {
  try {
    const { identity, stores, manuals } = await requireAdmin();
    const before = manuals.find((grant) => grant.id === id);
    if (!before) return failure("GRANT_NOT_FOUND");
    if (removesLastGlobalAdmin(before, input.accessType, manuals)) return failure("LAST_GLOBAL_ADMIN");
    const name = validInput(input, stores);
    if (!name) return failure("INVALID_SCOPE");
    if (manuals.some((grant) => grant.id !== id && grant.email === before.email && grant.accessType === input.accessType && grant.scopeId === input.scopeId)) return failure("DUPLICATE_GRANT");
    const safeUpdate: GrantUpdate = { accessType: input.accessType, scopeId: input.scopeId, note: input.note };
    const updated = await mockAccessRepository.updateManualGrant(id, safeUpdate, identity.email, name);
    return updated ? { ok: true, value: updated.id } : failure("GRANT_NOT_FOUND");
  } catch (error) { return failure(error instanceof Error && error.message === "NOT_AUTHORIZED" ? "NOT_AUTHORIZED" : "WRITE_FAILED"); }
}
export async function deleteManualGrant(id: string): Promise<MutationResult<string>> {
  try {
    const { identity, manuals } = await requireAdmin();
    const before = manuals.find((grant) => grant.id === id);
    if (!before) return failure("GRANT_NOT_FOUND");
    if (removesLastGlobalAdmin(before, null, manuals)) return failure("LAST_GLOBAL_ADMIN");
    return await mockAccessRepository.deleteManualGrant(id, identity.email) ? { ok: true, value: id } : failure("GRANT_NOT_FOUND");
  } catch (error) { return failure(error instanceof Error && error.message === "NOT_AUTHORIZED" ? "NOT_AUTHORIZED" : "WRITE_FAILED"); }
}
export async function queryAuditLog(email = ""): Promise<readonly AuditEvent[]> {
  await requireAdmin();
  const normalized = canonicalEmail(email);
  return (await mockAccessRepository.listAuditEvents()).filter((event) => !normalized || event.actorEmail.includes(normalized) || event.targetEmail.includes(normalized));
}
export async function getAccessCatalog(): Promise<AccessCatalog> {
  const { stores } = await requireAdmin();
  return {
    regions: [...new Set(stores.map((store) => store.region))].map((name) => ({ id: name, name })),
    areas: [...new Map(stores.map((store) => [areaScopeId(store.region, store.area), { id: areaScopeId(store.region, store.area), name: store.area, regionId: store.region }])).values()],
    stores: stores.map((store) => ({ id: store.storeId, name: store.displayName, regionId: store.region, areaId: areaScopeId(store.region, store.area) })),
  };
}
