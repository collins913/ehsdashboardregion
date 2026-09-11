import { describe, expect, it } from "vitest";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { loadKpiPageRows } from "@/features/kpi/kpi-page-content";

const q1Context: KpiFilterContext = {
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

function singleMonthContext(month: "2026-01" | "2026-02"): KpiFilterContext {
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
  it("loads repository data and builds rows for the shared Filter Context", () => {
    const rows = loadKpiPageRows(q1Context, mockEhsRepository);

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(mockEhsRepository.listFilterStores().length);
  });

  it("reflects Period changes without calculating Action aggregates in the page", () => {
    const januaryRows = loadKpiPageRows(
      singleMonthContext("2026-01"),
      mockEhsRepository,
    );
    const februaryRows = loadKpiPageRows(
      singleMonthContext("2026-02"),
      mockEhsRepository,
    );

    expect(januaryRows?.[0].actions.value).toBe(65);
    expect(februaryRows?.[0].actions.value).toBe(72);
  });

  it("does not query the Repository when the Filter Context is invalid", () => {
    let callCount = 0;
    const repository = {
      getKpiData() {
        callCount += 1;
        throw new Error("Repository must not be called.");
      },
    };

    expect(loadKpiPageRows(null, repository)).toBeNull();
    expect(callCount).toBe(0);
  });
});
