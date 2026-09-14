import { describe, expect, it } from "vitest";
import type { FilterScope, KpiStore } from "@/data/contracts/kpi";
import type { Month, StoreId } from "@/types/ehs";
import {
  BUSINESS_TIME_ZONE,
  changeArea,
  changeRegion,
  createInitialGlobalFilterState,
  includedMonthsBetween,
  periodForMode,
  periodFromMonthRange,
  toEhsFilterContext,
  type GlobalFilterState,
} from "@/features/global-filters/global-filter-state";

const stores = [
  {
    storeId: "store-a1",
    displayName: "甲一店",
    region: "甲区",
    area: "甲一部",
  },
  {
    storeId: "store-a2",
    displayName: "甲二店",
    region: "甲区",
    area: "甲二部",
  },
  {
    storeId: "store-b1",
    displayName: "乙一店",
    region: "乙区",
    area: "乙一部",
  },
] satisfies readonly KpiStore[];

function include<T>(...values: T[]): FilterScope<T> {
  return { kind: "INCLUDE", values: values as [T, ...T[]] };
}

function stateWithSelection(): GlobalFilterState {
  return {
    ...createInitialGlobalFilterState(),
    region: include("甲区"),
    area: include("甲一部"),
    store: include<StoreId>("store-a1"),
  };
}

describe("global filter hierarchy", () => {
  it("clears an Area and Store made invalid by a Region change", () => {
    const input = stateWithSelection();
    const result = changeRegion(input, include("乙区"), stores);

    expect(result.region).toEqual(include("乙区"));
    expect(result.area).toEqual({ kind: "ALL" });
    expect(result.store).toEqual({ kind: "ALL" });
    expect(input).toEqual(stateWithSelection());
  });

  it("retains an Area and valid Store when the Region remains compatible", () => {
    const input = stateWithSelection();
    const result = changeRegion(input, include("甲区"), stores);

    expect(result.area).toEqual(include("甲一部"));
    expect(result.store).toEqual(include("store-a1"));
  });

  it("clears a Store made invalid by an Area change", () => {
    const input = stateWithSelection();
    const result = changeArea(input, include("甲二部"), stores);

    expect(result.area).toEqual(include("甲二部"));
    expect(result.store).toEqual({ kind: "ALL" });
    expect(input.store).toEqual(include("store-a1"));
  });

  it("supports ALL, one canonical storeId, and multiple canonical storeIds", () => {
    const now = new Date("2026-08-15T00:00:00Z");
    const base = createInitialGlobalFilterState();

    expect(toEhsFilterContext(base, now, stores)?.store).toEqual({ kind: "ALL" });
    expect(
      toEhsFilterContext({ ...base, store: include("store-a1") }, now, stores)?.store,
    ).toEqual(include("store-a1"));
    expect(
      toEhsFilterContext(
        { ...base, store: include("store-a1", "store-a2") },
        now,
        stores,
      )?.store,
    ).toEqual(include("store-a1", "store-a2"));
  });
});

describe("natural-month periods", () => {
  it("defaults to the current Shanghai quarter", () => {
    const context = toEhsFilterContext(
      createInitialGlobalFilterState(),
      new Date("2026-08-15T23:00:00Z"),
      stores,
    );

    expect(context?.period).toEqual({
      startInclusive: "2026-07-01T00:00:00+08:00",
      endExclusive: "2026-09-01T00:00:00+08:00",
      includedMonths: ["2026-07", "2026-08"],
    });
  });

  it.each([
    ["2026-01-15T00:00:00+08:00", "2026-01", "2026-02", ["2026-01"]],
    ["2026-09-11T00:00:00+08:00", "2026-07", "2026-10", ["2026-07", "2026-08", "2026-09"]],
    ["2026-11-15T00:00:00+08:00", "2026-10", "2026-12", ["2026-10", "2026-11"]],
    ["2027-02-15T00:00:00+08:00", "2027-01", "2027-03", ["2027-01", "2027-02"]],
  ])("builds the correct natural quarter for %s", (instant, start, end, months) => {
    const period = periodForMode("THIS_QUARTER", new Date(instant));

    expect(period.startInclusive).toBe(`${start}-01T00:00:00+08:00`);
    expect(period.endExclusive).toBe(`${end}-01T00:00:00+08:00`);
    expect(period.includedMonths).toEqual(months);
  });

  it("builds the complete current month instead of ending at the current time", () => {
    expect(periodForMode("THIS_MONTH", new Date("2026-12-31T23:30:00Z"))).toEqual({
      startInclusive: "2027-01-01T00:00:00+08:00",
      endExclusive: "2027-02-01T00:00:00+08:00",
      includedMonths: ["2027-01"],
    });
  });

  it.each([
    ["2026-01-15T00:00:00+08:00", "2026-02", ["2026-01"]],
    [
      "2026-09-11T00:00:00+08:00",
      "2026-10",
      [
        "2026-01",
        "2026-02",
        "2026-03",
        "2026-04",
        "2026-05",
        "2026-06",
        "2026-07",
        "2026-08",
        "2026-09",
      ],
    ],
    [
      "2026-11-15T00:00:00+08:00",
      "2026-12",
      [
        "2026-01",
        "2026-02",
        "2026-03",
        "2026-04",
        "2026-05",
        "2026-06",
        "2026-07",
        "2026-08",
        "2026-09",
        "2026-10",
        "2026-11",
      ],
    ],
    ["2027-02-15T00:00:00+08:00", "2027-03", ["2027-01", "2027-02"]],
  ])("builds the current year through the current Shanghai month for %s", (instant, end, months) => {
    expect(BUSINESS_TIME_ZONE).toBe("Asia/Shanghai");
    const year = instant.slice(0, 4);

    expect(periodForMode("THIS_YEAR", new Date(instant))).toEqual({
      startInclusive: `${year}-01-01T00:00:00+08:00`,
      endExclusive: `${end}-01T00:00:00+08:00`,
      includedMonths: months,
    });
  });

  it.each([
    ["2026-07", "2026-07", "2026-08", ["2026-07"]],
    ["2026-07", "2026-09", "2026-10", ["2026-07", "2026-08", "2026-09"]],
    [
      "2025-11",
      "2026-02",
      "2026-03",
      ["2025-11", "2025-12", "2026-01", "2026-02"],
    ],
  ] satisfies readonly [Month, Month, Month, readonly Month[]][])(
    "builds a valid custom range from %s through %s",
    (start, end, nextMonth, months) => {
      const period = periodFromMonthRange(start, end);

      expect(period?.includedMonths).toEqual(months);
      expect(period?.startInclusive).toBe(`${start}-01T00:00:00+08:00`);
      expect(period?.endExclusive).toBe(`${nextMonth}-01T00:00:00+08:00`);
      const expectedEndIndex = includedMonthsBetween(start, end)?.length;
      expect(expectedEndIndex).toBe(months.length);
    },
  );

  it("rejects a reversed or malformed custom month range", () => {
    expect(periodFromMonthRange("2026-09", "2026-07")).toBeNull();
    expect(periodFromMonthRange("2026-13", "2027-01")).toBeNull();
  });

  it("does not create a Context from an invalid custom selection", () => {
    const state: GlobalFilterState = {
      ...createInitialGlobalFilterState(),
      period: {
        mode: "CUSTOM",
        startMonth: "2026-09",
        endMonth: "2026-07",
      },
    };

    expect(
      toEhsFilterContext(state, new Date("2026-08-15T00:00:00Z"), stores),
    ).toBeNull();
  });

  it("does not create a Context from an invalid hierarchy or storeId", () => {
    const now = new Date("2026-08-15T00:00:00Z");
    const base = createInitialGlobalFilterState();

    expect(
      toEhsFilterContext({ ...base, region: include("不存在区域") }, now, stores),
    ).toBeNull();
    expect(
      toEhsFilterContext(
        { ...base, store: include("unknown-store") },
        now,
        stores,
      ),
    ).toBeNull();
  });
});
