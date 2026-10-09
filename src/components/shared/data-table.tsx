"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type MouseEvent, type ReactNode, type SetStateAction } from "react";
import { columnVisibilityFeature, createColumnHelper, createPaginatedRowModel, createSortedRowModel, rowPaginationFeature, rowSortingFeature, sortFn_basic, sortFn_text, tableFeatures as defineTableFeatures, useTable, type PaginationState, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { dataTableClassName, dataTableCompactPrimaryClassName, dataTableColumnSizeClassNames, dataTableFrameClassName, dataTableRowClassName, stickyStoreCellClassName, stickyStoreHeaderClassName, type DataTableColumnSizeRole } from "@/components/shared/data-table-layout";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import { DataTableLoadingCellContent, DataTablePendingValue, useResolvedDataTableSnapshot } from "@/components/shared/data-table-loading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clampTablePageIndex, paginationForPageSize, useAdaptiveTablePageSize, type AdaptivePagination, type AdaptiveTablePageSize } from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";

const features = defineTableFeatures({ columnVisibilityFeature, rowPaginationFeature, rowSortingFeature, paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(), sortFns: { text: sortFn_text, numeric: sortFn_basic } });
const ROW_CLICK_IGNORED_TARGETS = "a,button,input,select,textarea,[role='button'],[role='link'],[role='checkbox'],[role='menuitem']";

export type DataTableColumn<T> = { id: string; title: string; value: (row: T) => string; sortValue?: (row: T) => number | null; render?: (row: T) => ReactNode; sortable?: boolean; sizeRole: DataTableColumnSizeRole };
export type DataTableInteractionState = { sorting: SortingState; pagination: AdaptivePagination | null };

export function DataTable<T extends { id: string }>({ rows, columns, emptyMessage, status = "READY", semanticKey = "", active = true, stickyFirstColumn = false, compactPrimaryColumn = false, interactionState, onInteractionStateChange, onRowClick, rowAriaLabel }: { rows: readonly T[]; columns: readonly DataTableColumn<T>[]; emptyMessage: string; status?: "READY" | "LOADING" | "ERROR"; semanticKey?: string; active?: boolean; stickyFirstColumn?: boolean; compactPrimaryColumn?: boolean; interactionState?: DataTableInteractionState; onInteractionStateChange?: Dispatch<SetStateAction<DataTableInteractionState>>; onRowClick?: (row: T, trigger: HTMLTableRowElement) => void; rowAriaLabel?: (row: T) => string }) {
  const { snapshot, pendingMode, isResolvedMetadataPending } = useResolvedDataTableSnapshot({ snapshot: status === "READY" ? rows : null, status, metadataKey: semanticKey });
  const displayedRows = snapshot ?? [];
  const [internalInteractionState, setInternalInteractionState] = useState<DataTableInteractionState>({ sorting: [], pagination: null });
  const currentInteractionState = interactionState ?? internalInteractionState;
  const setInteractionState = onInteractionStateChange ?? setInternalInteractionState;
  const sorting = currentInteractionState.sorting;
  const adaptivePagination = currentInteractionState.pagination;
  const setAdaptivePagination = useCallback((updater: SetStateAction<AdaptivePagination | null>) => {
    setInteractionState((current) => ({ ...current, pagination: typeof updater === "function" ? updater(current.pagination) : updater }));
  }, [setInteractionState]);
  const previousSemanticKey = useRef(semanticKey);
  useLayoutEffect(() => {
    if (previousSemanticKey.current === semanticKey) return;
    previousSemanticKey.current = semanticKey;
    if (!active) return;
    setAdaptivePagination((current) => current ? { ...current, pageIndex: 0 } : current);
  }, [active, semanticKey, setAdaptivePagination]);
  const pagination = useMemo<PaginationState>(() => adaptivePagination
    ? { pageIndex: clampTablePageIndex(adaptivePagination.pageIndex, displayedRows.length, adaptivePagination.pageSize), pageSize: adaptivePagination.pageSize }
    : { pageIndex: 0, pageSize: 1 }, [adaptivePagination, displayedRows.length]);
  const onPageSizeChange = useCallback((pageSize: AdaptiveTablePageSize) => {
    setAdaptivePagination((current) => {
      const next = paginationForPageSize(current ?? { pageIndex: 0, pageSize }, displayedRows.length, pageSize);
      return current?.pageIndex === next.pageIndex && current.pageSize === next.pageSize ? current : next;
    });
  }, [displayedRows.length]);
  const onPaginationChange = useCallback((updater: PaginationState | ((current: PaginationState) => PaginationState)) => {
    setAdaptivePagination((current) => {
      if (!current) return current;
      const resolved = { ...current, pageIndex: clampTablePageIndex(current.pageIndex, displayedRows.length, current.pageSize) };
      const proposed = typeof updater === "function" ? updater(resolved) : updater;
      return { ...current, pageIndex: clampTablePageIndex(proposed.pageIndex, displayedRows.length, current.pageSize) };
    });
  }, [displayedRows.length]);
  const { tableFrameRef, tableBodyRef, rowMeasurementRef, paginationRef } = useAdaptiveTablePageSize({
    enabled: active, ready: adaptivePagination !== null, currentPageSize: adaptivePagination?.pageSize ?? null, onPageSizeChange,
  });
  useEffect(() => {
    setAdaptivePagination((current) => {
      if (!current) return current;
      const pageIndex = clampTablePageIndex(current.pageIndex, displayedRows.length, current.pageSize);
      return current.pageIndex === pageIndex ? current : { ...current, pageIndex };
    });
  }, [displayedRows.length]);
  const definitions = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return helper.columns(columns.map((item) => helper.accessor((row) => item.sortValue ? item.sortValue(row) ?? undefined : item.value(row), {
      id: item.id,
      header: ({ column }) => <DataTableColumnHeader column={column} title={item.title} />,
      cell: ({ row }) => item.render ? item.render(row.original) : item.value(row.original),
      enableSorting: item.sortable !== false,
      sortFn: item.sortValue ? "numeric" : "text",
      ...(item.sortValue ? { sortUndefined: "last" as const } : {}),
    })));
  }, [columns]);
  const table = useTable({ features, columns: definitions, data: displayedRows, getRowId: (row) => row.id, onSortingChange: (updater) => { setInteractionState((current) => ({ sorting: typeof updater === "function" ? updater(current.sorting) : updater, pagination: current.pagination ? { ...current.pagination, pageIndex: 0 } : null })); }, onPaginationChange, state: { sorting, pagination } });
  const renderedRows = table.getRowModel().rows;
  const columnClassName = (role: DataTableColumnSizeRole) => cn(dataTableColumnSizeClassNames[role], compactPrimaryColumn && role === "primary" && dataTableCompactPrimaryClassName);
  const placeholderColumns = columns.map((item, index) => ({ id: item.id, className: cn(columnClassName(item.sizeRole), stickyFirstColumn && index === 0 && stickyStoreCellClassName) }));
  return <>
    <div ref={tableFrameRef} className={cn(dataTableFrameClassName, "@container/data-table")} aria-busy={status === "LOADING"} inert={status === "LOADING" ? true : undefined}><Table className={dataTableClassName}>
      <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header, index) => <TableHead key={header.id} className={cn(columnClassName(columns.find((item) => item.id === header.column.id)?.sizeRole ?? "standard"), stickyFirstColumn && index === 0 && stickyStoreHeaderClassName)}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>)}</TableRow>)}</TableHeader>
      <TableBody ref={tableBodyRef}>{!adaptivePagination ? <TableRow ref={rowMeasurementRef} aria-hidden="true" data-adaptive-table-measurement-row className="pointer-events-none invisible hover:bg-transparent"><TableCell colSpan={columns.length}><div className="h-8" /></TableCell></TableRow> : status === "ERROR" || (status === "LOADING" && renderedRows.length === 0) ? <DataTablePlaceholderRows columns={placeholderColumns} rowCount={pagination.pageSize} hidden={status === "ERROR"} /> : renderedRows.map((row, index) => {
        const rowInteractive = status === "READY" && onRowClick !== undefined;
        const onRowClickEvent = rowInteractive ? (event: MouseEvent<HTMLTableRowElement>) => {
          const target = event.target;
          if (target instanceof Element && target.closest(ROW_CLICK_IGNORED_TARGETS)) return;
          onRowClick(row.original, event.currentTarget);
        } : undefined;
        const onRowKeyDown = rowInteractive ? (event: KeyboardEvent<HTMLTableRowElement>) => {
          if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          onRowClick(row.original, event.currentTarget);
        } : undefined;
        return <TableRow key={row.id} ref={index === 0 ? rowMeasurementRef : undefined} aria-hidden={status === "LOADING" || undefined} aria-label={rowInteractive ? rowAriaLabel?.(row.original) : undefined} tabIndex={rowInteractive ? 0 : undefined} onClick={onRowClickEvent} onKeyDown={onRowKeyDown} className={cn(status !== "LOADING" && dataTableRowClassName, rowInteractive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", status === "LOADING" && "hover:bg-transparent")}>{row.getVisibleCells().map((cell, cellIndex) => <TableCell key={cell.id} className={cn(columnClassName(columns.find((item) => item.id === cell.column.id)?.sizeRole ?? "standard"), "break-words", stickyFirstColumn && cellIndex === 0 && stickyStoreCellClassName)}><DataTableLoadingCellContent loading={status === "LOADING"} pendingMode={pendingMode}><table.FlexRender cell={cell} /></DataTableLoadingCellContent></TableCell>)}</TableRow>;
      })}{status === "LOADING" && renderedRows.length > 0 ? <DataTablePlaceholderRows columns={placeholderColumns} rowCount={Math.max(0, pagination.pageSize - renderedRows.length)} /> : null}{status === "READY" && displayedRows.length === 0 && adaptivePagination ? <TableRow ref={rowMeasurementRef}><TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow> : null}</TableBody>
    </Table></div>
    <div ref={paginationRef} aria-hidden={!adaptivePagination} className={cn("mt-3 flex flex-wrap items-center justify-between gap-3", !adaptivePagination && "invisible")}>
      <span className="text-sm text-muted-foreground">共 <DataTablePendingValue pending={isResolvedMetadataPending}>{displayedRows.length}</DataTablePendingValue> 条</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">第 <DataTablePendingValue pending={isResolvedMetadataPending}>{pagination.pageIndex + 1}</DataTablePendingValue> / <DataTablePendingValue pending={isResolvedMetadataPending}>{Math.max(1, table.getPageCount())}</DataTablePendingValue> 页</span>
        <Button size="sm" variant="outline" disabled={status !== "READY" || !table.getCanPreviousPage()} onClick={() => table.previousPage()}>上一页</Button>
        <Button size="sm" variant="outline" disabled={status !== "READY" || !table.getCanNextPage()} onClick={() => table.nextPage()}>下一页</Button>
      </div>
    </div>
  </>;
}
