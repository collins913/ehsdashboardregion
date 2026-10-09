import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { EhsRepository } from "./ehs-repository";
import { composeProductionEhsRepository } from "./production-ehs-repository.server";

describe("Production EhsRepository composition", () => {
  it("rejects incomplete production coverage rather than using mock methods", () => {
    expect(() => composeProductionEhsRepository([{ getFilterStores: async () => [] }])).toThrow("INCOMPLETE_PRODUCTION_REPOSITORY");
  });
  it("rejects duplicate domain method wiring", () => {
    const partial = { getFilterStores: async () => [] } as unknown as Partial<EhsRepository>;
    expect(() => composeProductionEhsRepository([partial, partial])).toThrow("DUPLICATE_PRODUCTION_REPOSITORY_METHOD:getFilterStores");
  });
});
