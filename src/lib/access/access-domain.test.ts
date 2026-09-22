import { describe, expect, it } from "vitest";
import { mockStores } from "@/data/mock/stores";
import { mockManualGrants } from "@/data/mock/access-grants";
import { accountSummary, areaScopeId, authorizedScope, canonicalEmail, deriveBaseGrants, grantMatchesScope, resolveEffectiveAccess } from "@/lib/access/access-domain";
import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi";

const stores: KpiStore[] = mockStores.map((s) => ({ storeId: s.trtid, displayName: s.storeNameCn, region: s.region, area: s.area }));
const bases = deriveBaseGrants(mockStores);
const all: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } };
function access(email: string) { return resolveEffectiveAccess(email, bases, mockManualGrants, stores); }
describe("Access domain", () => {
  it("canonicalizes email and deduplicates repeated Region and Area owners", () => {
    expect(canonicalEmail("  A@EXAMPLE.TEST ")).toBe("a@example.test");
    expect(deriveBaseGrants([{ ...mockStores[0], regionOwnerEmail: "  REGION.NORTH@EXAMPLE.TEST " }])[0].email).toBe("region.north@example.test");
    expect(bases.filter((g) => g.source === "REGION_OWNER" && g.scopeId === "北辰区")).toHaveLength(1);
    expect(bases.filter((g) => g.source === "AREA_OWNER" && g.scopeId === areaScopeId("北辰区", "北辰一部"))).toHaveLength(1);
  });
  it("derives all four source types and treats null emails as no grant", () => {
    expect(new Set(bases.map((g) => g.source))).toEqual(new Set(["REGION_OWNER", "AREA_OWNER", "STORE_MANAGER", "EHSS_REPRESENTATIVE"]));
    expect(bases.some((g) => g.source === "STORE_MANAGER" && g.scopeId === "TEST-003")).toBe(false);
    expect(bases.some((g) => g.source === "EHSS_REPRESENTATIVE" && g.scopeId === "TEST-004")).toBe(false);
    expect(bases.some((g) => g.source === "REGION_OWNER" && g.scopeId === "南屿区")).toBe(false);
  });
  it("resolves global roles, inheritance and manual grants", () => {
    expect(access("ADMIN@EXAMPLE.TEST").globalRole).toBe("GLOBAL_ADMIN");
    expect(access("admin@example.test").canManageAccess).toBe(true);
    expect(access("global.user@example.test").globalRole).toBe("GLOBAL_USER");
    expect(access("global.user@example.test").canManageAccess).toBe(false);
    expect(access("region.north@example.test").allowedStoreIds).toContain("TEST-004");
    expect(access("area.1@example.test").allowedStoreIds).toContain("TEST-002");
    expect(access("area.1@example.test").allowedStoreIds).not.toContain("TEST-003");
    expect(access("manager.1@example.test").allowedStoreIds).toEqual(["TEST-001"]);
    expect(access("ehss.1@example.test").allowedStoreIds).toEqual(["TEST-001"]);
    expect(access("area.manual@example.test").allowedStoreIds).toContain("TEST-006");
    expect(access("multi@example.test").allowedStoreIds).toContain("TEST-005");
  });
  it("rejects unauthorized Store selection and clips all-scope queries", () => {
    const user = access("manager.1@example.test");
    expect(authorizedScope(all, user, stores)?.store).toEqual({ kind: "INCLUDE", values: ["TEST-001"] });
    expect(authorizedScope({ ...all, store: { kind: "INCLUDE", values: ["TEST-002"] } }, user, stores)).toBeNull();
  });
  it("matches intersecting scope without upgrading Store grants to Area grants", () => {
    const query = { scope: { ...all, area: { kind: "INCLUDE" as const, values: ["北辰一部"] as [string] } } };
    expect(grantMatchesScope(mockManualGrants[0], query.scope, stores)).toBe(true);
    expect(grantMatchesScope(bases.find((g) => g.email === "manager.1@example.test")!, query.scope, stores)).toBe(true);
    expect(access("manager.1@example.test").scopes.some((g) => g.accessType === "AREA")).toBe(false);
  });
  it("returns compact account summaries", () => {
    expect(accountSummary(access("admin@example.test")).summary).toBe("全局管理员");
    expect(accountSummary(access("global.user@example.test")).summary).toBe("全局用户");
    expect(accountSummary(access("region.north@example.test")).summary).toBe("北辰区");
    expect(accountSummary(access("area.1@example.test")).summary).toBe("北辰一部");
    expect(accountSummary(access("manager.1@example.test")).summary).toBe("云川引力场中心");
    expect(accountSummary(access("multi@example.test")).summary).toBe("2 个访问范围");
    expect(accountSummary(access("no.access@example.test")).scopes).toHaveLength(0);
  });
});
