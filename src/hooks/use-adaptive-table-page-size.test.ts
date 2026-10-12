import { describe, expect, it } from "vitest";
import {
  clampTablePageIndex,
  clampAdaptivePagination,
  resizeAdaptivePagination,
  updateAdaptivePagination,
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
  it("starts measurement on page zero and avoids redundant size updates", () => {
    expect(resizeAdaptivePagination(null, 12, 7)).toEqual({ pageIndex: 0, pageSize: 7 });
    const current = { pageIndex: 1, pageSize: 7 } as const;
    expect(resizeAdaptivePagination(current, 12, 7)).toBe(current);
    expect(resizeAdaptivePagination(current, 4, 10)).toEqual({ pageIndex: 0, pageSize: 10 });
  });

  it("clamps client pagination before an updater sees a reduced data set", () => {
    const current = { pageIndex: 3, pageSize: 5 } as const;
    let observedPageIndex: number | undefined;
    const next = updateAdaptivePagination(current, (resolved) => {
      observedPageIndex = resolved.pageIndex;
      return { pageIndex: resolved.pageIndex + 1, pageSize: 100 };
    }, 6);
    expect(observedPageIndex).toBe(1);
    expect(next).toEqual({ pageIndex: 1, pageSize: 5 });
    expect(updateAdaptivePagination(next, { pageIndex: -1, pageSize: 100 }, 6)).toEqual({ pageIndex: 0, pageSize: 5 });
    expect(clampAdaptivePagination(current, 0)).toEqual({ pageIndex: 0, pageSize: 5 });
    expect(clampAdaptivePagination(next, 6)).toBe(next);
  });

  it("lets the repository resolve the upper page bound without using stale counts", () => {
    const current = { pageIndex: 3, pageSize: 7 } as const;
    expect(updateAdaptivePagination(current, (page) => ({ ...page, pageIndex: page.pageIndex + 1 })))
      .toEqual({ pageIndex: 4, pageSize: 7 });
    expect(updateAdaptivePagination(current, { pageIndex: -1, pageSize: 100 }))
      .toEqual({ pageIndex: 0, pageSize: 7 });
    expect(updateAdaptivePagination(current, { pageIndex: 3, pageSize: 100 })).toBe(current);
  });

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
