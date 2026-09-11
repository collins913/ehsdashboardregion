"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { PaginationState } from "@tanstack/react-table";

export const ADAPTIVE_TABLE_PAGE_SIZES = [5, 7, 10] as const;

const DEFAULT_TABLE_ROW_HEIGHT_PX = 48;
const DEFAULT_BOTTOM_RESERVE_PX = 32;
const PAGE_SIZE_HYSTERESIS_PX = 4;

export type AdaptiveTablePageSize =
  (typeof ADAPTIVE_TABLE_PAGE_SIZES)[number];

export type AdaptivePagination = {
  pageIndex: number;
  pageSize: AdaptiveTablePageSize;
};

export function pageSizeForRowCapacity(
  rowCapacity: number,
): AdaptiveTablePageSize {
  if (rowCapacity >= 10) {
    return 10;
  }

  if (rowCapacity >= 7) {
    return 7;
  }

  return 5;
}

export function selectStableAdaptivePageSize({
  availableBodyHeight,
  rowHeight,
  currentPageSize,
  hysteresis = PAGE_SIZE_HYSTERESIS_PX,
}: {
  availableBodyHeight: number;
  rowHeight: number;
  currentPageSize: AdaptiveTablePageSize | null;
  hysteresis?: number;
}): AdaptiveTablePageSize {
  const rowCapacity = Math.floor(
    Math.max(0, availableBodyHeight) / Math.max(1, rowHeight),
  );
  const nextPageSize = pageSizeForRowCapacity(rowCapacity);

  if (
    currentPageSize !== null &&
    nextPageSize < currentPageSize &&
    availableBodyHeight >= currentPageSize * rowHeight - hysteresis
  ) {
    return currentPageSize;
  }

  return nextPageSize;
}

export function clampTablePageIndex(
  pageIndex: number,
  itemCount: number,
  pageSize: number,
): number {
  const lastPageIndex = Math.max(0, Math.ceil(itemCount / pageSize) - 1);

  return Math.min(Math.max(0, pageIndex), lastPageIndex);
}

export function paginationForPageSize(
  current: PaginationState,
  itemCount: number,
  pageSize: AdaptiveTablePageSize,
): AdaptivePagination {
  return {
    pageIndex: clampTablePageIndex(current.pageIndex, itemCount, pageSize),
    pageSize,
  };
}

type UseAdaptiveTablePageSizeOptions = {
  ready: boolean;
  currentPageSize: AdaptiveTablePageSize | null;
  onPageSizeChange: (pageSize: AdaptiveTablePageSize) => void;
  bottomReserve?: number;
};

export function useAdaptiveTablePageSize({
  ready,
  currentPageSize,
  onPageSizeChange,
  bottomReserve = DEFAULT_BOTTOM_RESERVE_PX,
}: UseAdaptiveTablePageSizeOptions) {
  const tableFrameRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const rowMeasurementRef = useRef<HTMLTableRowElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const measuredRowHeightRef = useRef(DEFAULT_TABLE_ROW_HEIGHT_PX);

  const readPageSize = useCallback((): AdaptiveTablePageSize | null => {
    const tableFrame = tableFrameRef.current;
    const tableBody = tableBodyRef.current;
    const rowMeasurement = rowMeasurementRef.current;
    const pagination = paginationRef.current;

    if (!tableFrame || !tableBody || !rowMeasurement || !pagination) {
      return null;
    }

    const measuredRowHeight = rowMeasurement.getBoundingClientRect().height;

    if (measuredRowHeight > 0) {
      measuredRowHeightRef.current = measuredRowHeight;
    }

    const bodyTop = tableBody.getBoundingClientRect().top;
    const tableBottom = tableFrame.getBoundingClientRect().bottom;
    const paginationRect = pagination.getBoundingClientRect();
    const tableToPaginationGap = Math.max(0, paginationRect.top - tableBottom);
    const availableBodyHeight =
      window.innerHeight -
      bodyTop -
      paginationRect.height -
      tableToPaginationGap -
      bottomReserve;

    return selectStableAdaptivePageSize({
      availableBodyHeight,
      rowHeight: measuredRowHeightRef.current,
      currentPageSize,
    });
  }, [bottomReserve, currentPageSize]);

  const recompute = useCallback(
    (externalLayoutChange: boolean) => {
      const nextPageSize = readPageSize();

      if (
        nextPageSize === null ||
        (ready && nextPageSize === currentPageSize)
      ) {
        return;
      }

      if (externalLayoutChange) {
        flushSync(() => onPageSizeChange(nextPageSize));
        return;
      }

      onPageSizeChange(nextPageSize);
    },
    [currentPageSize, onPageSizeChange, readPageSize, ready],
  );

  useLayoutEffect(() => {
    recompute(false);
  });

  useLayoutEffect(() => {
    if (!ready) {
      return;
    }

    const pagination = paginationRef.current;
    const resizeObserver =
      pagination && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => recompute(true))
        : null;
    const handleWindowResize = () => recompute(true);

    if (pagination) {
      resizeObserver?.observe(pagination);
    }
    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [ready, recompute]);

  return {
    tableFrameRef,
    tableBodyRef,
    rowMeasurementRef,
    paginationRef,
  };
}
