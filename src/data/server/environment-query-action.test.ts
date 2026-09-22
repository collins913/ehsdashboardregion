import { describe, expect, it, vi } from "vitest";

const { getEnvironment, factory } = vi.hoisted(() => {
  const getEnvironment = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [] }));
  return { getEnvironment, factory: vi.fn(() => ({ getEnvironment })) };
});
vi.mock("@/data/repositories/create-ehs-repository.server", () => ({ createEhsRepository: factory }));
vi.mock("@/lib/access/access-service.server", () => ({ authorizeBusinessScope: async (query: unknown) => query }));
import { queryEnvironment } from "./ehs-query-actions";
import type { EhsStoreScope } from "@/data/contracts/kpi";

describe("Environment Server Action", () => {
  it("delegates the serializable context to the same server Repository factory", async () => {
    const query: EhsStoreScope = {
      region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
    };
    const referenceDateIso = "2026-09-15T00:00:00+08:00";
    expect(await queryEnvironment({ referenceDateIso, query })).toEqual({ availability: "CONFIRMED_EMPTY", items: [] });
    expect(factory).toHaveBeenCalledWith(new Date(referenceDateIso));
    expect(getEnvironment).toHaveBeenCalledWith({ context: query });
  });
});
