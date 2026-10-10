import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertMockIdentityAllowed, resolveBusinessReferenceDate, resolveDataSourceMode } from "./data-source-mode.server";
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
  it("requires enterprise identity whenever the production data source is selected", () => {
    expect(resolveIdentityMode({ NODE_ENV: "development", EHS_DATA_SOURCE: "production" })).toBe("enterprise");
    expect(() => resolveIdentityMode({ NODE_ENV: "development", EHS_DATA_SOURCE: "production", EHS_IDENTITY_MODE: "mock" })).toThrow("MOCK_IDENTITY_FORBIDDEN_WITH_PRODUCTION_DATA");
  });
  it("does not fabricate an enterprise server identity provider", () => {
    expect(() => createConfiguredServerIdentityProvider()).toThrow("SERVER_IDENTITY_PROVIDER_NOT_CONFIGURED");
  });
  it("uses the trusted server clock for production business dates", () => {
    const serverNow = new Date("2026-10-09T15:59:00.000Z");
    expect(resolveBusinessReferenceDate(
      "2020-01-01T00:00:00.000Z",
      { NODE_ENV: "production", EHS_DATA_SOURCE: "production" },
      () => serverNow,
    )).toBe(serverNow);
  });
  it("keeps injected reference dates in Mock mode", () => {
    expect(resolveBusinessReferenceDate(
      "2026-09-11T00:00:00+08:00",
      { NODE_ENV: "test", EHS_DATA_SOURCE: "mock" },
      () => new Date("2026-10-09T00:00:00.000Z"),
    ).toISOString()).toBe("2026-09-10T16:00:00.000Z");
  });
});
