import type { EhsStoreScope } from "@/data/contracts/kpi";

export type AccessType = "GLOBAL_USER" | "GLOBAL_ADMIN" | "REGION" | "AREA" | "STORE";
export type BaseSource = "REGION_OWNER" | "AREA_OWNER" | "STORE_MANAGER" | "EHSS_REPRESENTATIVE";
export type AccessScope = { accessType: AccessType; scopeId: string | null; scopeDisplayName: string };
export type Identity = { email: string };
export type BaseGrant = AccessScope & { email: string; source: BaseSource; sourceDetail: string };
export type ManualGrant = AccessScope & {
  id: string; email: string; grantedBy: string; grantedAt: string;
  note: string | null; updatedBy: string | null; updatedAt: string | null;
};
export type EffectiveAccess = {
  email: string; globalRole: "GLOBAL_ADMIN" | "GLOBAL_USER" | null;
  scopes: readonly AccessScope[]; allowedStoreIds: readonly string[]; canManageAccess: boolean;
};
export type AccountSummary = { email: string; summary: string; scopes: readonly string[]; canManageAccess: boolean };
export type AuditAction = "CREATE" | "UPDATE" | "DELETE";
export type AuditEvent = {
  id: string; timestamp: string; action: AuditAction; actorEmail: string;
  targetEmail: string; grantId: string; scopeType: AccessType; scopeId: string | null;
  scopeDisplayName: string; before: ManualGrant | null; after: ManualGrant | null; note: string | null;
};
export type MutationCode = "EMAIL_REQUIRED" | "INVALID_EMAIL" | "INVALID_INPUT" | "DUPLICATE_GRANT" | "INVALID_SCOPE" | "LAST_GLOBAL_ADMIN" | "NOT_AUTHORIZED" | "GRANT_NOT_FOUND" | "WRITE_FAILED";
export type MutationResult<T> = { ok: true; value: T } | { ok: false; code: MutationCode; message: string };
export type GrantInput = { email: string; accessType: AccessType; scopeId: string | null; note: string | null };
export type GrantUpdate = Omit<GrantInput, "email">;
export type AccessQuery = { email?: string; scope?: EhsStoreScope };
export type AccessCatalog = {
  regions: readonly { id: string; name: string }[];
  areas: readonly { id: string; name: string; regionId: string }[];
  stores: readonly { id: string; name: string; regionId: string; areaId: string }[];
};
