import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { loadKpiPageRows } from "@/features/kpi/kpi-page-content";

const q1Context: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: {
    startInclusive: "2026-01-01T00:00:00+08:00",
    endExclusive: "2026-04-01T00:00:00+08:00",
    includedMonths: ["2026-01", "2026-02", "2026-03"],
  },
};
const mockEhsRepository = createMockEhsRepository(
  new Date("2026-03-15T00:00:00+08:00"),
);
const referenceDateIso = "2026-03-15T00:00:00+08:00";
const queryRows = async ({ query }: { referenceDateIso: string; query: EhsFilterContext }) =>
  buildKpiRows(query, await mockEhsRepository.getKpiData(query));

function singleMonthContext(month: "2026-01" | "2026-02"): EhsFilterContext {
  const nextMonth = month === "2026-01" ? "2026-02" : "2026-03";

  return {
    ...q1Context,
    store: { kind: "INCLUDE", values: ["TEST-001"] },
    period: {
      startInclusive: `${month}-01T00:00:00+08:00`,
      endExclusive: `${nextMonth}-01T00:00:00+08:00`,
      includedMonths: [month],
    },
  };
}

describe("KPI page data connection", () => {
  it("loads repository data and builds rows for the shared Filter Context", async () => {
    const rows = await loadKpiPageRows(q1Context, referenceDateIso, queryRows);

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength((await mockEhsRepository.getFilterStores()).length);
  });

  it("reflects Period changes without calculating Action aggregates in the page", async () => {
    const januaryRows = await loadKpiPageRows(
      singleMonthContext("2026-01"),
      referenceDateIso,
      queryRows,
    );
    const februaryRows = await loadKpiPageRows(
      singleMonthContext("2026-02"),
      referenceDateIso,
      queryRows,
    );

    expect(januaryRows?.[0].actions.value).toBe(65);
    expect(februaryRows?.[0].actions.value).toBe(72);
  });

  it("does not query the Repository when the Filter Context is invalid", async () => {
    let callCount = 0;
    const query = async () => {
        callCount += 1;
        throw new Error("Repository must not be called.");
    };

    expect(await loadKpiPageRows(null, referenceDateIso, query)).toBeNull();
    expect(callCount).toBe(0);
  });
});
