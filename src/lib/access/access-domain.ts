import type { StoreMasterData } from "@/types/ehs";
import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi";
import type { AccessScope, AccountSummary, BaseGrant, EffectiveAccess, ManualGrant } from "@/data/contracts/access";

export function canonicalEmail(value: string): string { return value.trim().toLowerCase(); }
export function areaScopeId(region: string, area: string): string { return `${region}::${area}`; }
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(value: string): boolean { return validEmail.test(canonicalEmail(value)); }
export function deriveBaseGrants(stores: readonly StoreMasterData[]): BaseGrant[] {
  const grants = new Map<string, BaseGrant>();
  const add = (email: string | null | undefined, accessType: AccessScope["accessType"], scopeId: string, scopeDisplayName: string, source: BaseGrant["source"], sourceDetail: string) => {
    if (!email?.trim() || !isValidEmail(email)) return;
    const normalized = canonicalEmail(email);
    const key = `${normalized}|${accessType}|${scopeId}|${source}`;
    if (!grants.has(key)) grants.set(key, { email: normalized, accessType, scopeId, scopeDisplayName, source, sourceDetail });
  };
  for (const store of stores) {
    add(store.regionOwnerEmail, "REGION", store.region, store.region, "REGION_OWNER", store.regionOwner ?? "—");
    add(store.areaOwnerEmail, "AREA", areaScopeId(store.region, store.area), store.area, "AREA_OWNER", store.areaOwner ?? "—");
    add(store.managerEmail, "STORE", store.trtid, store.storeNameCn, "STORE_MANAGER", store.manager ?? "—");
    add(store.ehsAmbassadorEmail, "STORE", store.trtid, store.storeNameCn, "EHSS_REPRESENTATIVE", store.ehsAmbassador ?? "—");
  }
  return [...grants.values()];
}
export function resolveEffectiveAccess(email: string, bases: readonly BaseGrant[], manuals: readonly ManualGrant[], stores: readonly KpiStore[]): EffectiveAccess {
  const identity = canonicalEmail(email);
  const active = manuals.filter((grant) => grant.email === identity);
  const globalRole = active.some((grant) => grant.accessType === "GLOBAL_ADMIN") ? "GLOBAL_ADMIN" : active.some((grant) => grant.accessType === "GLOBAL_USER") ? "GLOBAL_USER" : null;
  const all = [...bases.filter((grant) => grant.email === identity), ...active];
  const scopes = [...new Map(all.map((grant) => [`${grant.accessType}|${grant.scopeId ?? ""}`, { accessType: grant.accessType, scopeId: grant.scopeId, scopeDisplayName: grant.scopeDisplayName }])).values()];
  const allowedStoreIds = globalRole ? stores.map((store) => store.storeId) : stores.filter((store) => scopes.some((scope) => scope.accessType === "REGION" && scope.scopeId === store.region || scope.accessType === "AREA" && scope.scopeId === areaScopeId(store.region, store.area) || scope.accessType === "STORE" && scope.scopeId === store.storeId)).map((store) => store.storeId);
  return { email: identity, globalRole, scopes, allowedStoreIds, canManageAccess: globalRole === "GLOBAL_ADMIN" };
}
export function accountSummary(access: EffectiveAccess): AccountSummary {
  const summary = access.globalRole === "GLOBAL_ADMIN" ? "全局管理员" : access.globalRole === "GLOBAL_USER" ? "全局用户" : access.scopes.length === 1 ? access.scopes[0].scopeDisplayName : access.scopes.length > 1 ? `${access.scopes.length} 个访问范围` : "暂无访问权限";
  return { email: access.email, summary, scopes: access.globalRole ? [summary] : access.scopes.map((scope) => `${scope.accessType === "REGION" ? "区域" : scope.accessType === "AREA" ? "小区" : "门店"} · ${scope.scopeDisplayName}`), canManageAccess: access.canManageAccess };
}
function inFilter(store: KpiStore, scope: EhsStoreScope): boolean {
  return (scope.region.kind === "ALL" || scope.region.values.includes(store.region)) && (scope.area.kind === "ALL" || scope.area.values.includes(store.area)) && (scope.store.kind === "ALL" || scope.store.values.includes(store.storeId));
}
export function authorizedScope(requested: EhsStoreScope, access: EffectiveAccess, stores: readonly KpiStore[]): EhsStoreScope | null {
  const requestedStores = stores.filter((store) => inFilter(store, requested));
  if (requested.store.kind === "INCLUDE" && requested.store.values.some((id) => !access.allowedStoreIds.includes(id))) return null;
  const ids = requestedStores.map((store) => store.storeId).filter((id) => access.allowedStoreIds.includes(id));
  if (ids.length === 0) return null;
  return { region: requested.region, area: requested.area, store: { kind: "INCLUDE", values: ids as [string, ...string[]] } };
}
export function grantMatchesScope(grant: AccessScope, queryScope: EhsStoreScope | undefined, stores: readonly KpiStore[]): boolean {
  if (!queryScope) return true;
  const filterStores = stores.filter((store) => inFilter(store, queryScope));
  return grant.accessType.startsWith("GLOBAL") || filterStores.some((store) => grant.accessType === "REGION" && grant.scopeId === store.region || grant.accessType === "AREA" && grant.scopeId === areaScopeId(store.region, store.area) || grant.accessType === "STORE" && grant.scopeId === store.storeId);
}
