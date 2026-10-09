import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/data/mock/mock-dataset", () => ({ getMockDataset: vi.fn() }));
vi.mock("@/data/mock/mock-profile.server", () => ({ resolveMockProfile: vi.fn() }));
vi.mock("@/data/repositories/mock-ehs-repository", () => ({ createMockEhsRepository: vi.fn() }));
vi.mock("@/data/repositories/production-ehs-repository.server", () => ({ createConfiguredProductionEhsRepository: vi.fn(() => { throw new Error("PRODUCTION_REPOSITORY_ADAPTER_NOT_CONFIGURED"); }) }));

import { createEhsRepository } from "./create-ehs-repository.server";
import { getMockDataset } from "@/data/mock/mock-dataset";
import { resolveMockProfile } from "@/data/mock/mock-profile.server";

describe("Production Repository source isolation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed without falling back to either Mock profile", () => {
    vi.stubEnv("EHS_DATA_SOURCE", "production");
    expect(() => createEhsRepository(new Date("2026-10-01T00:00:00Z"))).toThrow("PRODUCTION_REPOSITORY_ADAPTER_NOT_CONFIGURED");
    expect(getMockDataset).not.toHaveBeenCalled();
    expect(resolveMockProfile).not.toHaveBeenCalled();
  });
});
