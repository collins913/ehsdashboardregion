"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { columnVisibilityFeature, createColumnHelper, createPaginatedRowModel, createSortedRowModel, rowPaginationFeature, rowSortingFeature, sortFn_text, tableFeatures as defineTableFeatures, useTable, type PaginationState, type SortingState } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { dataTableClassName, dataTableColumnSizeClassNames, dataTableFrameClassName, type DataTableColumnSizeRole } from "@/components/shared/data-table-layout";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clampTablePageIndex, paginationForPageSize, useAdaptiveTablePageSize, type AdaptivePagination, type AdaptiveTablePageSize } from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";

const features = defineTableFeatures({ columnVisibilityFeature, rowPaginationFeature, rowSortingFeature, paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(), sortFns: { text: sortFn_text } });

export type DataTableColumn<T> = { id: string; title: string; value: (row: T) => string; render?: (row: T) => ReactNode; sortable?: boolean; sizeRole: DataTableColumnSizeRole };

export function DataTable<T extends { id: string }>({ rows, columns, emptyMessage, status = "READY" }: { rows: readonly T[]; columns: readonly DataTableColumn<T>[]; emptyMessage: string; status?: "READY" | "LOADING" | "ERROR" }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [adaptivePagination, setAdaptivePagination] = useState<AdaptivePagination | null>(null);
  const pagination = useMemo<PaginationState>(() => adaptivePagination
    ? { pageIndex: clampTablePageIndex(adaptivePagination.pageIndex, rows.length, adaptivePagination.pageSize), pageSize: adaptivePagination.pageSize }
    : { pageIndex: 0, pageSize: 1 }, [adaptivePagination, rows.length]);
  const onPageSizeChange = useCallback((pageSize: AdaptiveTablePageSize) => {
    setAdaptivePagination((current) => {
      const next = paginationForPageSize(current ?? { pageIndex: 0, pageSize }, rows.length, pageSize);
      return current?.pageIndex === next.pageIndex && current.pageSize === next.pageSize ? current : next;
    });
  }, [rows.length]);
  const onPaginationChange = useCallback((updater: PaginationState | ((current: PaginationState) => PaginationState)) => {
    setAdaptivePagination((current) => {
      if (!current) return current;
      const resolved = { ...current, pageIndex: clampTablePageIndex(current.pageIndex, rows.length, current.pageSize) };
      const proposed = typeof updater === "function" ? updater(resolved) : updater;
      return { ...current, pageIndex: clampTablePageIndex(proposed.pageIndex, rows.length, current.pageSize) };
    });
  }, [rows.length]);
  const { tableFrameRef, tableBodyRef, rowMeasurementRef, paginationRef } = useAdaptiveTablePageSize({
    ready: adaptivePagination !== null, currentPageSize: adaptivePagination?.pageSize ?? null, onPageSizeChange,
  });
  useEffect(() => {
    setAdaptivePagination((current) => {
      if (!current) return current;
      const pageIndex = clampTablePageIndex(current.pageIndex, rows.length, current.pageSize);
      return current.pageIndex === pageIndex ? current : { ...current, pageIndex };
    });
  }, [rows.length]);
  const definitions = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return helper.columns(columns.map((item) => helper.accessor(item.value, {
      id: item.id,
      header: ({ column }) => <DataTableColumnHeader column={column} title={item.title} />,
      cell: ({ row, getValue }) => item.render ? item.render(row.original) : getValue(),
      enableSorting: item.sortable !== false,
      sortFn: "text",
    })));
  }, [columns]);
  const table = useTable({ features, columns: definitions, data: rows, getRowId: (row) => row.id, onSortingChange: (updater) => { setSorting(updater); setAdaptivePagination((current) => current ? { ...current, pageIndex: 0 } : current); }, onPaginationChange, state: { sorting, pagination } });
  return <>
    <div ref={tableFrameRef} className={dataTableFrameClassName} aria-busy={status === "LOADING"}><Table className={dataTableClassName}>
      <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} className={dataTableColumnSizeClassNames[columns.find((item) => item.id === header.column.id)?.sizeRole ?? "standard"]}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>)}</TableRow>)}</TableHeader>
      <TableBody ref={tableBodyRef}>{!adaptivePagination ? <TableRow ref={rowMeasurementRef} aria-hidden="true" data-adaptive-table-measurement-row className="pointer-events-none invisible hover:bg-transparent"><TableCell colSpan={columns.length}><div className="h-8" /></TableCell></TableRow> : status !== "READY" ? <><TableRow ref={rowMeasurementRef} aria-hidden="true" className="pointer-events-none invisible hover:bg-transparent"><TableCell colSpan={columns.length}><div className="h-8" /></TableCell></TableRow><DataTablePlaceholderRows columns={columns.map((item) => ({ id: item.id, className: dataTableColumnSizeClassNames[item.sizeRole] }))} rowCount={Math.max(0, pagination.pageSize - 1)} hidden={status === "ERROR"} /></> : table.getRowModel().rows.map((row, index) => <TableRow key={row.id} ref={index === 0 ? rowMeasurementRef : undefined}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cn(dataTableColumnSizeClassNames[columns.find((item) => item.id === cell.column.id)?.sizeRole ?? "standard"], "break-words")}><table.FlexRender cell={cell} /></TableCell>)}</TableRow>)}{status === "READY" && rows.length === 0 && adaptivePagination ? <TableRow ref={rowMeasurementRef}><TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow> : null}</TableBody>
    </Table></div>
    <div ref={paginationRef} aria-hidden={!adaptivePagination} className={cn("mt-3 flex items-center justify-end gap-2 text-sm", !adaptivePagination && "invisible")}><span>共 {rows.length} 条</span><Button size="sm" variant="outline" disabled={status !== "READY" || !table.getCanPreviousPage()} onClick={() => table.previousPage()}>上一页</Button><span>第 {pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())} 页</span><Button size="sm" variant="outline" disabled={status !== "READY" || !table.getCanNextPage()} onClick={() => table.nextPage()}>下一页</Button></div>
  </>;
}
