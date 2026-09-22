import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { authorizeBusinessScope, createManualGrant, deleteManualGrant, getAccountSummary, getAuthorizedFilterStores, listManualGrants, queryAuditLog, requireAdmin, updateManualGrant } from "@/lib/access/access-service.server";
import type { EhsStoreScope } from "@/data/contracts/kpi";
const all: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } };
afterEach(() => vi.unstubAllEnvs());
describe("Access server service", () => {
  it("defaults to the mock Global Admin identity", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "");
    expect((await getAccountSummary()).summary).toBe("全局管理员");
    expect(await requireAdmin()).toBeDefined();
  });
  it("blocks non-admin reads and mutations", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "global.user@example.test");
    await expect(requireAdmin()).rejects.toThrow("NOT_AUTHORIZED");
    await expect(listManualGrants()).rejects.toThrow("NOT_AUTHORIZED");
    await expect(queryAuditLog()).rejects.toThrow("NOT_AUTHORIZED");
    expect((await createManualGrant({ email: "x@example.test", accessType: "STORE", scopeId: "TEST-001", note: null })).ok).toBe(false);
  });
  it("limits filter options and business query scope before return", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "manager.1@example.test");
    expect((await getAuthorizedFilterStores()).map((s) => s.storeId)).toEqual(["TEST-001"]);
    expect((await authorizeBusinessScope(all)).store).toEqual({ kind: "INCLUDE", values: ["TEST-001"] });
    await expect(authorizeBusinessScope({ ...all, store: { kind: "INCLUDE", values: ["TEST-002"] } })).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("returns empty effective access for the no-access identity", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "no.access@example.test");
    expect((await getAccountSummary()).scopes).toHaveLength(0);
    expect(await getAuthorizedFilterStores()).toHaveLength(0);
    await expect(authorizeBusinessScope(all)).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("creates, updates and deletes grants with append-only audit", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    const email = "crud.access.test@example.test";
    const created = await createManualGrant({ email: ` ${email.toUpperCase()} `, accessType: "STORE", scopeId: "TEST-001", note: "test" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect((await createManualGrant({ email, accessType: "STORE", scopeId: "TEST-001", note: null })).ok).toBe(false);
    expect((await updateManualGrant(created.value, { accessType: "AREA", scopeId: "北辰区::北辰一部", note: "updated", email: "forged@example.test" } as never)).ok).toBe(true);
    expect((await listManualGrants({ email })).find((grant) => grant.id === created.value)?.email).toBe(email);
    expect((await deleteManualGrant(created.value)).ok).toBe(true);
    const events = (await queryAuditLog(email)).filter((e) => e.grantId === created.value);
    expect(events.map((e) => e.action)).toEqual(["DELETE", "UPDATE", "CREATE"]);
    expect(events.find((e) => e.action === "UPDATE")?.before?.accessType).toBe("STORE");
    expect(events.find((e) => e.action === "UPDATE")?.after?.accessType).toBe("AREA");
  });
  it("exposes all five manual grant types", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    const rows = await listManualGrants();
    expect(new Set(rows.map((row) => row.accessType))).toEqual(new Set(["GLOBAL_ADMIN", "GLOBAL_USER", "REGION", "AREA", "STORE"]));
  });
  it("keeps the last effective Global Admin when a grant is changed or deleted", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    const changed = await updateManualGrant("grant-admin", { accessType: "GLOBAL_USER", scopeId: null, note: null });
    const deleted = await deleteManualGrant("grant-admin");
    expect(changed).toMatchObject({ ok: false, code: "LAST_GLOBAL_ADMIN" });
    expect(deleted).toMatchObject({ ok: false, code: "LAST_GLOBAL_ADMIN" });
    expect((await listManualGrants()).find((grant) => grant.id === "grant-admin")?.accessType).toBe("GLOBAL_ADMIN");
  });
  it("searches audit by actor and target email", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    const email = "audit.search.test@example.test";
    const result = await createManualGrant({ email, accessType: "GLOBAL_USER", scopeId: null, note: null });
    expect(result.ok).toBe(true);
    expect((await queryAuditLog(email)).some((event) => event.targetEmail === email)).toBe(true);
    expect((await queryAuditLog("admin@example.test")).some((event) => event.targetEmail === email && event.actorEmail === "admin@example.test")).toBe(true);
  });
});
