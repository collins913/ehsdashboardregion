import { describe, expect, it } from "vitest";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { periodForMode, periodFromMonthRange } from "@/data/contracts/kpi-period";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";

function contextFor(
  referenceDate: Date,
  mode: "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" = "THIS_QUARTER",
): KpiFilterContext {
  return {
    region: { kind: "ALL" },
    area: { kind: "ALL" },
    store: { kind: "ALL" },
    period: periodForMode(mode, referenceDate),
  };
}

describe("current-year KPI mock factory", () => {
  it.each([
    ["2026-01-15T00:00:00+08:00", ["2026-01"]],
    ["2026-09-11T00:00:00+08:00", ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]],
    ["2026-11-15T00:00:00+08:00", ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]],
    ["2027-02-15T00:00:00+08:00", ["2027-01", "2027-02"]],
  ])("generates data and coverage through the reference month %s", (iso, months) => {
    const referenceDate = new Date(iso);
    const data = createKpiMockData(referenceDate);
    const repository = createMockEhsRepository(referenceDate);
    const snapshot = repository.getKpiData(contextFor(referenceDate));

    expect(data.supportedMonths).toEqual(months);
    expect(data.coverage.period).toEqual(data.supportedPeriod);
    expect(snapshot.training.availability).toBe("AVAILABLE");
    expect(snapshot.drills.availability).toBe("AVAILABLE");
    expect(snapshot.inspections.availability).toBe("AVAILABLE");
    expect(snapshot.actionClosureRates.availability).toBe("AVAILABLE");
    expect(snapshot.events.availability).toBe("AVAILABLE");
  });

  it("is deterministic for a fixed referenceDate", () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");

    expect(createKpiMockData(referenceDate)).toEqual(
      createKpiMockData(referenceDate),
    );
  });

  it("keeps generated Action aggregates aligned with declared scopes", () => {
    const data = createKpiMockData(
      new Date("2026-09-11T00:00:00+08:00"),
    );
    const scopes = new Set(
      data.coverage.actionAggregateScopes.map(
        ({ startInclusive, endExclusive }) =>
          `${startInclusive}/${endExclusive}`,
      ),
    );

    expect(data.actionClosureRates).not.toHaveLength(0);
    expect(
      data.actionClosureRates.every((record) =>
        scopes.has(`${record.startInclusive}/${record.endExclusive}`),
      ),
    ).toBe(true);
  });

  it("provides varied KPI results for the supported Period", () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const context = contextFor(referenceDate);
    const rows = buildKpiRows(context, repository.getKpiData(context));
    const byStore = new Map(rows.map((row) => [row.store.storeId, row]));

    expect(byStore.get("TEST-001")).toMatchObject({
      training: { availability: "AVAILABLE", result: "ACHIEVED" },
      drill: { availability: "AVAILABLE", result: "ACHIEVED" },
      actions: { availability: "AVAILABLE", value: 92, result: "ACHIEVED" },
      inspections: { availability: "AVAILABLE", result: "ACHIEVED" },
      astmEvents: { availability: "CONFIRMED_EMPTY", result: "NOT_OCCURRED" },
    });
    expect(byStore.get("TEST-002")).toMatchObject({
      training: { availability: "AVAILABLE", result: "NOT_ACHIEVED" },
      drill: { availability: "AVAILABLE", result: "NOT_ACHIEVED" },
      actions: { availability: "AVAILABLE", value: 86, result: "NOT_ACHIEVED" },
      inspections: { availability: "AVAILABLE", result: "NOT_ACHIEVED" },
      astmEvents: { availability: "CONFIRMED_EMPTY", result: "NOT_OCCURRED" },
    });
    expect(byStore.get("TEST-003")?.astmEvents).toEqual({
      availability: "AVAILABLE",
      result: "OCCURRED",
    });
    expect(byStore.get("TEST-012")?.training).toEqual({
      availability: "AVAILABLE",
      result: "ACHIEVED",
    });
  });

  it("supports month, current quarter, YTD and custom Action aggregates", () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const customPeriod = periodFromMonthRange("2026-03", "2026-06")!;
    const contexts: readonly (
      readonly [KpiFilterContext, number, "ACHIEVED" | "NOT_ACHIEVED"]
    )[] = [
      [contextFor(referenceDate, "THIS_MONTH"), 81, "NOT_ACHIEVED"],
      [contextFor(referenceDate, "THIS_QUARTER"), 92, "ACHIEVED"],
      [contextFor(referenceDate, "THIS_YEAR"), 92, "ACHIEVED"],
      [{ ...contextFor(referenceDate), period: customPeriod }, 94, "ACHIEVED"],
    ];

    for (const [context, expectedValue, expectedResult] of contexts) {
      const row = buildKpiRows(context, repository.getKpiData(context))[0];

      expect(row.actions.availability).toBe("AVAILABLE");
      expect(row.actions.value).toBe(expectedValue);
      expect(row.actions.result).toBe(expectedResult);
    }
  });

  it.each(["THIS_MONTH", "THIS_QUARTER", "THIS_YEAR"] as const)(
    "keeps current OPEN Action details available for %s",
    (mode) => {
      const referenceDate = new Date("2026-09-11T00:00:00+08:00");
      const repository = createMockEhsRepository(referenceDate);
      const context: KpiFilterContext = {
        ...contextFor(referenceDate, mode),
        store: { kind: "INCLUDE", values: ["TEST-001"] },
      };
      const snapshot = repository.getKpiData(context);
      const row = buildKpiRows(context, snapshot)[0];

      expect(snapshot.actionClosureRates.availability).toBe("AVAILABLE");
      expect(snapshot.actions.availability).toBe("AVAILABLE");
      expect(row.actions.openActions.availability).toBe("AVAILABLE");
      expect(
        row.actions.openActions.items.map(({ actionId }) => actionId),
      ).toEqual(["ACT-2026-07-001", "ACT-2026-08-002"]);
    },
  );

  it("keeps closed and excluded Action details out of the Sheet data", () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const context: KpiFilterContext = {
      ...contextFor(referenceDate, "THIS_MONTH"),
      store: { kind: "INCLUDE", values: ["TEST-002"] },
    };
    const snapshot = repository.getKpiData(context);
    const row = buildKpiRows(context, snapshot)[0];

    expect(snapshot.actions.availability).toBe("AVAILABLE");
    expect(snapshot.actions.items.map(({ Status }) => Status)).toEqual([
      { kind: "KNOWN", value: "Closed" },
      { kind: "KNOWN", value: "Cancelled" },
    ]);
    expect(row.actions.openActions).toEqual({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
  });

  it("returns genuine INCOMPLETE availability outside supportedMonths", () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const unsupportedPeriod = periodFromMonthRange("2026-10", "2026-10")!;
    const context = { ...contextFor(referenceDate), period: unsupportedPeriod };
    const snapshot = repository.getKpiData(context);
    const rows = buildKpiRows(context, snapshot);

    expect(snapshot.training.availability).toBe("INCOMPLETE");
    expect(snapshot.events.availability).toBe("INCOMPLETE");
    expect(rows[0].training.result).toBe("UNDETERMINED");
    expect(rows[0].astmEvents.result).toBeNull();
  });
});
