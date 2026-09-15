import { describe, expect, it, vi } from "vitest";

const { getCertificates, factory } = vi.hoisted(() => {
  const getCertificates = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [], unknownTypeRecords: [] }));
  return { getCertificates, factory: vi.fn(() => ({ getCertificates })) };
});
vi.mock("@/data/repositories/create-ehs-repository.server", () => ({ createEhsRepository: factory }));
import { queryCertificates } from "./ehs-query-actions";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";

describe("Certificates Server Action", () => {
  it("delegates the serializable context to the same server Repository factory", async () => {
    const query: EhsFilterContext = {
      region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
      period: periodFromMonthRange("2026-07", "2026-09")!,
    };
    const referenceDateIso = "2026-09-15T00:00:00+08:00";
    expect(await queryCertificates({ referenceDateIso, query })).toEqual({ availability: "CONFIRMED_EMPTY", items: [], unknownTypeRecords: [] });
    expect(factory).toHaveBeenCalledWith(new Date(referenceDateIso));
    expect(getCertificates).toHaveBeenCalledWith({ context: query });
  });
});
