import type { AccessScope, AuditAction, ManualGrant } from "@/data/contracts/access";
import { formatBusinessDateTime } from "@/lib/format-business-date-time";

export const accessTypeLabels = { GLOBAL_USER: "全局用户", GLOBAL_ADMIN: "全局管理员", REGION: "区域", AREA: "小区", STORE: "门店" } as const;
export const auditActionLabels: Record<AuditAction, string> = { CREATE: "新增", UPDATE: "修改", DELETE: "删除" };
export function scopeLabel(scope: AccessScope): string {
  return scope.scopeDisplayName;
}
export function display(value: string | null | undefined): string { return value?.trim() ? value : "—"; }
export function grantFields(grant: ManualGrant | null) {
  return grant ? [
    ["邮箱", grant.email], ["权限类型", accessTypeLabels[grant.accessType]], ["权限范围", scopeLabel(grant)],
    ["授权人", grant.grantedBy], ["授权时间", formatBusinessDateTime(grant.grantedAt)],
    ["备注", display(grant.note)], ["更新人", display(grant.updatedBy)], ["更新时间", formatBusinessDateTime(grant.updatedAt)],
  ] as const : [];
}
