import { describe, expect, it } from "vitest";
import {
  clampTablePageIndex,
  pageSizeForRowCapacity,
  paginationForPageSize,
  selectStableAdaptivePageSize,
} from "./use-adaptive-table-page-size";

describe("adaptive table page size", () => {
  it.each([
    [0, 5],
    [6, 5],
    [7, 7],
    [9, 7],
    [10, 10],
    [100, 10],
  ] as const)("maps row capacity %s to %s", (capacity, expected) => {
    expect(pageSizeForRowCapacity(capacity)).toBe(expected);
  });

  it("only returns supported page sizes", () => {
    const results = Array.from({ length: 30 }, (_, capacity) =>
      pageSizeForRowCapacity(capacity),
    );

    expect(new Set(results)).toEqual(new Set([5, 7, 10]));
  });

  it("does not apply hysteresis before the first measurement", () => {
    expect(
      selectStableAdaptivePageSize({
        availableBodyHeight: 6 * 48,
        rowHeight: 48,
        currentPageSize: null,
      }),
    ).toBe(5);
  });

  it("keeps the committed tier within the four pixel hysteresis", () => {
    expect(
      selectStableAdaptivePageSize({
        availableBodyHeight: 10 * 48 - 2,
        rowHeight: 48,
        currentPageSize: 10,
      }),
    ).toBe(10);
    expect(
      selectStableAdaptivePageSize({
        availableBodyHeight: 10 * 48 - 5,
        rowHeight: 48,
        currentPageSize: 10,
      }),
    ).toBe(7);
  });
});

describe("adaptive table pagination", () => {
  it("updates pageSize and clamps pageIndex in one result", () => {
    expect(paginationForPageSize({ pageIndex: 2, pageSize: 5 }, 12, 7)).toEqual({
      pageIndex: 1,
      pageSize: 7,
    });
    expect(paginationForPageSize({ pageIndex: 2, pageSize: 7 }, 12, 10)).toEqual({
      pageIndex: 1,
      pageSize: 10,
    });
  });

  it("keeps a valid page index", () => {
    expect(clampTablePageIndex(2, 12, 5)).toBe(2);
  });

  it("returns to the first page when filtered data fits on one page", () => {
    expect(clampTablePageIndex(2, 6, 10)).toBe(0);
    expect(clampTablePageIndex(3, 0, 7)).toBe(0);
  });
});
