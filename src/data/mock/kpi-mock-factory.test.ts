import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodForMode, periodFromMonthRange } from "@/data/contracts/kpi-period";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { mockPeople } from "@/data/mock/people";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";

function contextFor(
  referenceDate: Date,
  mode: "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" = "THIS_QUARTER",
): EhsFilterContext {
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
  ])("generates data and coverage through the reference month %s", async (iso, months) => {
    const referenceDate = new Date(iso);
    const data = createKpiMockData(referenceDate);
    const repository = createMockEhsRepository(referenceDate);
    const snapshot = await repository.getKpiData(contextFor(referenceDate));

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

  it("generates deterministic source-like Take Charge identifiers and datetimes", () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const first = createKpiMockData(referenceDate).takeChargeRecords;
    const second = createKpiMockData(referenceDate).takeChargeRecords;
    const ids = first.map(({ tchId }) => tchId);

    expect(first).toEqual(second);
    expect(ids.every((id) => /^TCH-\d{7}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      first.every(({ submittedAt }) =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(submittedAt),
      ),
    ).toBe(true);
    expect(new Set(first.map(({ submittedAt }) => submittedAt.slice(11, 16))).size)
      .toBeGreaterThan(1);
  });

  it("shares the deterministic mixed Chinese-English person pool", () => {
    const data = createKpiMockData(
      new Date("2026-09-11T00:00:00+08:00"),
    );
    const knownPeople = new Set<string>(mockPeople);

    expect(data.takeChargeRecords.every(({ submittedBy }) => knownPeople.has(submittedBy)))
      .toBe(true);
    expect(
      data.actionRecords.every(
        ({ submittedBy, owner }) =>
          knownPeople.has(submittedBy) && knownPeople.has(owner),
      ),
    ).toBe(true);
    expect(data.eventRecords.every(({ submittedBy }) => knownPeople.has(submittedBy)))
      .toBe(true);
    expect(mockPeople.every((name) => /^[A-Za-z ]+（[^ ]+ [^）]+）$/.test(name)))
      .toBe(true);
  });

  it("generates unique five-digit Event fixture IDs without constraining source IDs", () => {
    const { eventRecords } = createKpiMockData(
      new Date("2026-09-11T00:00:00+08:00"),
    );
    const eventIds = eventRecords.map(({ eventId }) => eventId);

    expect(eventIds.every((eventId) => /^EVT-\d{5}$/.test(eventId))).toBe(true);
    expect(new Set(eventIds).size).toBe(eventIds.length);
  });

  it("provides enough current-quarter Action records for adaptive pagination", async () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const openActions = await repository.getActions({
      context: contextFor(referenceDate),
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 100,
    });
    const allActions = await repository.getActions({
      context: contextFor(referenceDate),
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 100,
    });

    expect(openActions.availability).toBe("AVAILABLE");
    expect(openActions.items).toHaveLength(15);
    expect(allActions.items).toHaveLength(20);
    expect(
      new Set(allActions.items.map(({ sourceStatus }) => sourceStatus.value)),
    ).toEqual(
      new Set([
        "Assigned",
        "In Progress",
        "In Review",
        "Sign Off",
        "Closed",
        "Cancelled",
        "Pending Verification",
      ]),
    );
  });

  it("uses the confirmed source-like Action fields", () => {
    const [action] = createKpiMockData(
      new Date("2026-09-11T00:00:00+08:00"),
    ).actionRecords;

    expect(action).toMatchObject({
      actionId: expect.any(String),
      problem: expect.any(String),
      action: expect.any(String),
      submittedBy: expect.any(String),
      owner: expect.any(String),
      submittedDate: expect.stringMatching(/^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
      dueDate: expect.stringMatching(/^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
      Status: expect.any(String),
    });
    expect(action).not.toHaveProperty("actionTitle");
    expect(action).not.toHaveProperty("createdDate");
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

  it("provides varied KPI results for the supported Period", async () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const context = contextFor(referenceDate);
    const rows = buildKpiRows(context, await repository.getKpiData(context));
    const byStore = new Map(rows.map((row) => [row.store.storeId, row]));

    expect(byStore.get("TEST-001")).toMatchObject({
      training: { availability: "AVAILABLE", result: "ACHIEVED" },
      drill: { availability: "AVAILABLE", result: "ACHIEVED" },
      actions: { availability: "AVAILABLE", value: 92, result: "ACHIEVED" },
      inspections: { availability: "AVAILABLE", result: "ACHIEVED" },
      astmEvents: { availability: "AVAILABLE", result: "NOT_OCCURRED" },
    });
    expect(byStore.get("TEST-002")).toMatchObject({
      training: { availability: "AVAILABLE", result: "NOT_ACHIEVED" },
      drill: { availability: "AVAILABLE", result: "NOT_ACHIEVED" },
      actions: { availability: "AVAILABLE", value: 86, result: "NOT_ACHIEVED" },
      inspections: { availability: "AVAILABLE", result: "NOT_ACHIEVED" },
      astmEvents: { availability: "AVAILABLE", result: "NOT_OCCURRED" },
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

  it("supports month, current quarter, YTD and custom Action aggregates", async () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const customPeriod = periodFromMonthRange("2026-03", "2026-06")!;
    const contexts: readonly (
      readonly [EhsFilterContext, number, "ACHIEVED" | "NOT_ACHIEVED"]
    )[] = [
      [contextFor(referenceDate, "THIS_MONTH"), 81, "NOT_ACHIEVED"],
      [contextFor(referenceDate, "THIS_QUARTER"), 92, "ACHIEVED"],
      [contextFor(referenceDate, "THIS_YEAR"), 92, "ACHIEVED"],
      [{ ...contextFor(referenceDate), period: customPeriod }, 94, "ACHIEVED"],
    ];

    for (const [context, expectedValue, expectedResult] of contexts) {
      const row = buildKpiRows(context, await repository.getKpiData(context))[0];

      expect(row.actions.availability).toBe("AVAILABLE");
      expect(row.actions.value).toBe(expectedValue);
      expect(row.actions.result).toBe(expectedResult);
    }
  });

  it.each([
    ["THIS_MONTH", ["ACT-1000015", "ACT-1000016"]],
    [
      "THIS_QUARTER",
      [
        "ACT-1000001",
        "ACT-1000002",
        "ACT-1000007",
        "ACT-1000011",
        "ACT-1000015",
        "ACT-1000016",
      ],
    ],
    [
      "THIS_YEAR",
      [
        "ACT-1000001",
        "ACT-1000002",
        "ACT-1000007",
        "ACT-1000011",
        "ACT-1000015",
        "ACT-1000016",
      ],
    ],
  ] as const)(
    "applies the %s Submitted Date scope to OPEN Action drill-down details",
    async (mode, expectedActionIds) => {
      const referenceDate = new Date("2026-09-11T00:00:00+08:00");
      const repository = createMockEhsRepository(referenceDate);
      const context: EhsFilterContext = {
        ...contextFor(referenceDate, mode),
        store: { kind: "INCLUDE", values: ["TEST-001"] },
      };
      const snapshot = await repository.getKpiData(context);
      const row = buildKpiRows(context, snapshot)[0];

      expect(snapshot.actionClosureRates.availability).toBe("AVAILABLE");
      expect(snapshot.actions.availability).toBe("AVAILABLE");
      expect(row.actions.openActions.availability).toBe("AVAILABLE");
      expect(row.actions.openActions.items.map(({ actionId }) => actionId)).toEqual(
        expectedActionIds,
      );
    },
  );

  it("keeps closed and excluded Action details out of the Sheet data", async () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const context: EhsFilterContext = {
      ...contextFor(referenceDate, "THIS_MONTH"),
      store: { kind: "INCLUDE", values: ["TEST-002"] },
    };
    const snapshot = await repository.getKpiData(context);
    const row = buildKpiRows(context, snapshot)[0];

    expect(snapshot.actions.availability).toBe("CONFIRMED_EMPTY");
    expect(snapshot.actions.items).toEqual([]);
    expect(row.actions.openActions).toEqual({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
  });

  it("returns genuine INCOMPLETE availability outside supportedMonths", async () => {
    const referenceDate = new Date("2026-09-11T00:00:00+08:00");
    const repository = createMockEhsRepository(referenceDate);
    const unsupportedPeriod = periodFromMonthRange("2026-10", "2026-10")!;
    const context = { ...contextFor(referenceDate), period: unsupportedPeriod };
    const snapshot = await repository.getKpiData(context);
    const rows = buildKpiRows(context, snapshot);

    expect(snapshot.training.availability).toBe("INCOMPLETE");
    expect(snapshot.events.availability).toBe("INCOMPLETE");
    expect(rows[0].training.result).toBe("UNDETERMINED");
    expect(rows[0].astmEvents.result).toBeNull();
  });
});
