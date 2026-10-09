import { afterEach, describe, expect, it, vi } from "vitest";

const { getAccessRuntime, requireVerifiedServerPrincipal } = vi.hoisted(() => ({
  getAccessRuntime: vi.fn(),
  requireVerifiedServerPrincipal: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/data/repositories/access/access-runtime.server", () => ({ getAccessRuntime }));
vi.mock("@/data/server/identity-provider.server", () => ({ requireVerifiedServerPrincipal }));

import { currentAccess } from "@/lib/access/access-service.server";

afterEach(() => vi.clearAllMocks());

describe("Access identity initialization order", () => {
  it("does not resolve protected Access runtime when identity is unauthenticated", async () => {
    requireVerifiedServerPrincipal.mockRejectedValueOnce(new Error("NOT_AUTHENTICATED"));
    await expect(currentAccess()).rejects.toThrow("NOT_AUTHENTICATED");
    expect(getAccessRuntime).not.toHaveBeenCalled();
  });

  it("does not resolve protected Access runtime when verified identity lacks grant-mapping email", async () => {
    requireVerifiedServerPrincipal.mockResolvedValueOnce({ principalId: "trusted-id", verifiedEmail: null });
    await expect(currentAccess()).rejects.toThrow("VERIFIED_EMAIL_REQUIRED_FOR_ACCESS_MAPPING");
    expect(getAccessRuntime).not.toHaveBeenCalled();
  });
});
