import type { ManualGrant } from "@/data/contracts/access";

export const MOCK_GLOBAL_ADMIN_EMAIL = "admin@example.test";
export const MOCK_NO_ACCESS_EMAIL = "no.access@example.test";
export const mockManualGrants: readonly ManualGrant[] = [
  { id: "grant-admin", email: MOCK_GLOBAL_ADMIN_EMAIL, accessType: "GLOBAL_ADMIN", scopeId: null, scopeDisplayName: "全部", grantedBy: MOCK_GLOBAL_ADMIN_EMAIL, grantedAt: "2026-08-01T08:00:00.000Z", note: "开发默认管理员", updatedBy: null, updatedAt: null },
  { id: "grant-user", email: "global.user@example.test", accessType: "GLOBAL_USER", scopeId: null, scopeDisplayName: "全部", grantedBy: MOCK_GLOBAL_ADMIN_EMAIL, grantedAt: "2026-08-02T08:00:00.000Z", note: null, updatedBy: null, updatedAt: null },
  { id: "grant-region", email: "multi@example.test", accessType: "REGION", scopeId: "北辰区", scopeDisplayName: "北辰区", grantedBy: MOCK_GLOBAL_ADMIN_EMAIL, grantedAt: "2026-08-03T08:00:00.000Z", note: null, updatedBy: null, updatedAt: null },
  { id: "grant-area", email: "area.manual@example.test", accessType: "AREA", scopeId: "南屿区::南屿一部", scopeDisplayName: "南屿一部", grantedBy: MOCK_GLOBAL_ADMIN_EMAIL, grantedAt: "2026-08-04T08:00:00.000Z", note: null, updatedBy: null, updatedAt: null },
  { id: "grant-store", email: "multi@example.test", accessType: "STORE", scopeId: "TEST-005", scopeDisplayName: "云岚东岭引力场中心", grantedBy: MOCK_GLOBAL_ADMIN_EMAIL, grantedAt: "2026-08-05T08:00:00.000Z", note: null, updatedBy: null, updatedAt: null },
];
