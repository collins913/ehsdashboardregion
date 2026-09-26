import { describe, expect, it, vi } from "vitest";

const { getCertificates, factory } = vi.hoisted(() => {
  const getCertificates = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [], unknownTypeRecords: [] }));
  return { getCertificates, factory: vi.fn(() => ({ getCertificates })) };
});
vi.mock("@/data/repositories/create-ehs-repository.server", () => ({ createEhsRepository: factory }));
vi.mock("@/lib/access/access-service.server", () => ({ authorizeBusinessScope: async (query: unknown) => query }));
import { queryCertificates } from "./ehs-query-actions";
import type { EhsStoreScope } from "@/data/contracts/kpi";

describe("Certificates Server Action", () => {
  it("delegates the serializable context to the same server Repository factory", async () => {
    const query: EhsStoreScope = {
      region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
    };
    const referenceDateIso = "2026-09-15T00:00:00+08:00";
    const result = await queryCertificates({ referenceDateIso, query });
    expect(result).toMatchObject({ availability: "CONFIRMED_EMPTY", items: [], unknownTypeRecords: [] });
    expect(result.overview.items).toHaveLength(8);
    expect(result.overview.items.every((item) => item.actualCount === 0)).toBe(true);
    expect(result.overview.items.filter((item) => item.requiredCount === null)).toHaveLength(2);
    expect(factory).toHaveBeenCalledWith(new Date(referenceDateIso));
    expect(getCertificates).toHaveBeenCalledWith({ context: query });
  });
});
