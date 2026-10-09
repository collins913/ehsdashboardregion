import { describe, expect, it } from "vitest";
import { bootstrapFirstAdmin } from "./first-admin-bootstrap";
import { MemoryFirstAdminBootstrapStore } from "@/data/server/testing/memory-first-admin-bootstrap-store";

describe("first administrator bootstrap", () => {
  it("requires exact trusted principal and initializes once", async () => {
    const store = new MemoryFirstAdminBootstrapStore();
    const principal = { principalId: "enterprise-123", verifiedEmail: "admin@example.com" };
    expect(await bootstrapFirstAdmin(principal, undefined, store, "2026-10-09T00:00:00Z")).toBe("PRINCIPAL_NOT_ALLOWED");
    expect(await bootstrapFirstAdmin(principal, "different", store, "2026-10-09T00:00:00Z")).toBe("PRINCIPAL_NOT_ALLOWED");
    expect(await bootstrapFirstAdmin(principal, "enterprise-123", store, "2026-10-09T00:00:00Z")).toBe("INITIALIZED");
    expect(await bootstrapFirstAdmin(principal, "enterprise-123", store, "2026-10-09T00:00:00Z")).toBe("ALREADY_INITIALIZED");
    expect(store.value()?.principalId).toBe("enterprise-123");
  });
  it("does not initialize from unverified email", async () => {
    const store = new MemoryFirstAdminBootstrapStore();
    expect(await bootstrapFirstAdmin({ principalId: "enterprise-123", verifiedEmail: null }, "enterprise-123", store, "2026-10-09T00:00:00Z")).toBe("VERIFIED_EMAIL_REQUIRED");
  });
});
