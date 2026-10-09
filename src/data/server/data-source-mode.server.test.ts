import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertMockIdentityAllowed, resolveDataSourceMode } from "./data-source-mode.server";
import { createConfiguredServerIdentityProvider, resolveIdentityMode } from "./identity-provider.server";

describe("production mode isolation", () => {
  it("requires explicit production data source and rejects unknown modes", () => {
    expect(() => resolveDataSourceMode({ NODE_ENV: "production" })).toThrow("EHS_DATA_SOURCE_REQUIRED");
    expect(() => resolveDataSourceMode({ NODE_ENV: "production", EHS_DATA_SOURCE: "test" })).toThrow("INVALID_EHS_DATA_SOURCE");
    expect(resolveDataSourceMode({ NODE_ENV: "production", EHS_DATA_SOURCE: "production" })).toBe("production");
  });
  it("prevents mock identity from activating in production", () => {
    expect(resolveIdentityMode({ NODE_ENV: "production" })).toBe("enterprise");
    expect(() => resolveIdentityMode({ NODE_ENV: "production", EHS_IDENTITY_MODE: "mock" })).toThrow("MOCK_IDENTITY_FORBIDDEN_IN_PRODUCTION");
    expect(() => assertMockIdentityAllowed({ NODE_ENV: "production" })).toThrow("MOCK_IDENTITY_FORBIDDEN_IN_PRODUCTION");
  });
  it("does not fabricate an enterprise server identity provider", () => {
    expect(() => createConfiguredServerIdentityProvider()).toThrow("SERVER_IDENTITY_PROVIDER_NOT_CONFIGURED");
  });
});
