import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { queryStores } from "@/data/server/ehs-query-actions";
import { loadAuditLog, loadManualGrants } from "@/data/server/access-actions";
import type { EhsStoreScope } from "@/data/contracts/kpi";
const all: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } };
afterEach(() => vi.unstubAllEnvs());
describe("server authorization boundary", () => {
  it("returns only authorized Store rows and rejects a forged Store ID", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "manager.1@example.test");
    const date = "2026-09-22T00:00:00.000Z";
    const authorized = await queryStores({ referenceDateIso: date, query: all });
    expect(authorized.items.map((row) => row.storeId)).toEqual(["TEST-001"]);
    await expect(queryStores({ referenceDateIso: date, query: { ...all, store: { kind: "INCLUDE", values: ["TEST-002"] } } })).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("rejects direct management Server Action calls from a non-admin", async () => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "global.user@example.test");
    await expect(loadManualGrants({})).rejects.toThrow("NOT_AUTHORIZED");
    await expect(loadAuditLog("")).rejects.toThrow("NOT_AUTHORIZED");
  });
});
