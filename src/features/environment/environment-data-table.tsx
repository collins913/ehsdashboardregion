"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  columnVisibilityFeature, type ColumnVisibilityState, createColumnHelper,
  createPaginatedRowModel, createSortedRowModel, type OnChangeFn,
  type PaginationState, rowPaginationFeature, rowSortingFeature,
  type SortingState, sortFn_text, tableFeatures as defineTableFeatures, useTable,
} from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import { DataTableLoadingCellContent, DataTablePendingValue, useResolvedDataTableSnapshot, useRetainedDataTableRows } from "@/components/shared/data-table-loading";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import {
  dataTableColumnContentClassNames, dataTableColumnSizeClassNames, dataTableClassName,
  dataTableFrameClassName, stickyStoreCellClassName, stickyStoreHeaderClassName,
} from "@/components/shared/data-table-layout";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import type { EnvironmentSourceValue } from "@/types/ehs";
import {
  type AdaptivePagination, type AdaptiveTablePageSize, clampTablePageIndex,
  paginationForPageSize, useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";
import { buildEnvironmentDetail, ENVIRONMENT_ITEMS, type EnvironmentDetail, type EnvironmentItemKey } from "./environment-view-model";

const environmentTableFeatures = defineTableFeatures({
  columnVisibilityFeature, rowPaginationFeature, rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});
const columnHelper = createColumnHelper<typeof environmentTableFeatures, NormalizedEnvironmentRecord>();
const columnLabels = Object.fromEntries([ ["store", "门店"], ...ENVIRONMENT_ITEMS.map(({ key, label }) => [key, label]) ]);

export function EnvironmentValue({ value }: { value: EnvironmentSourceValue }) {
  return <Badge variant="outline">{value}</Badge>;
}

export function EnvironmentDetailContent({ detail }: { detail: EnvironmentDetail }) {
  const fields = [["门店", detail.storeDisplayName], ["环境项目", detail.itemName], ["当前状态", detail.value]];
  return (
    <div className="px-4 pb-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">详情字段待定义</p>
    </div>
  );
}

export function EnvironmentDataTable({ rows, queryKey, queryStatus }: {
  rows: readonly NormalizedEnvironmentRecord[];
  queryKey: string;
  queryStatus: "READY" | "LOADING" | "ERROR";
}) {
  const [detail, setDetail] = useState<EnvironmentDetail | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [adaptivePagination, setAdaptivePagination] = useState<AdaptivePagination | null>(null);
  const loading = queryStatus === "LOADING";
  const { snapshot, isResolvedMetadataPending, pendingMode } = useResolvedDataTableSnapshot({ snapshot: rows, status: queryStatus, metadataKey: queryKey });
  const tableRows = snapshot ?? [];
  const pagination = useMemo<PaginationState>(() => adaptivePagination
    ? { pageIndex: clampTablePageIndex(adaptivePagination.pageIndex, tableRows.length, adaptivePagination.pageSize), pageSize: adaptivePagination.pageSize }
    : { pageIndex: 0, pageSize: 1 }, [adaptivePagination, tableRows.length]);
  const onPageSizeChange = useCallback((pageSize: AdaptiveTablePageSize) => {
    setAdaptivePagination((current) => {
      const next = paginationForPageSize(current ?? { pageIndex: 0, pageSize }, tableRows.length, pageSize);
      return current?.pageIndex === next.pageIndex && current.pageSize === next.pageSize ? current : next;
    });
  }, [tableRows.length]);
  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>((updater) => {
    setAdaptivePagination((current) => {
      if (!current) return current;
      const resolved = { ...current, pageIndex: clampTablePageIndex(current.pageIndex, tableRows.length, current.pageSize) };
      const proposed = typeof updater === "function" ? updater(resolved) : updater;
      return { ...current, pageIndex: clampTablePageIndex(proposed.pageIndex, tableRows.length, current.pageSize) };
    });
  }, [tableRows.length]);
  const { tableFrameRef, tableBodyRef, rowMeasurementRef, paginationRef } = useAdaptiveTablePageSize({
    ready: adaptivePagination !== null, currentPageSize: adaptivePagination?.pageSize ?? null, onPageSizeChange,
  });
  useLayoutEffect(() => { if (queryStatus !== "READY") setDetail(null); }, [queryStatus]);
  useLayoutEffect(() => {
    setAdaptivePagination((current) => {
      if (!current) return current;
      const pageIndex = clampTablePageIndex(current.pageIndex, tableRows.length, current.pageSize);
      return current.pageIndex === pageIndex ? current : { ...current, pageIndex };
    });
  }, [tableRows.length]);
  const openDetail = useCallback((record: NormalizedEnvironmentRecord, key: EnvironmentItemKey) => setDetail(buildEnvironmentDetail(record, key)), []);
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor("storeDisplayName", {
      id: "store", header: ({ column }) => <DataTableColumnHeader column={column} title="门店" />,
      cell: ({ getValue }) => <OverflowTooltip text={getValue()} className={cn(dataTableColumnContentClassNames.primary, "font-medium")} />,
      enableHiding: false, sortFn: "text",
    }),
    ...ENVIRONMENT_ITEMS.map(({ key, label }) => columnHelper.accessor(key, {
      id: key, header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
      cell: ({ row, getValue }) => (
        <TableCellTrigger aria-label={`查看${row.original.storeDisplayName}的${label}详情`} onClick={() => openDetail(row.original, key)}>
          <EnvironmentValue value={getValue()} />
        </TableCellTrigger>
      ), sortFn: "text",
    })),
  ]), [openDetail]);
  const table = useTable({ features: environmentTableFeatures, columns, data: tableRows, getRowId: (record) => record.storeId,
    onSortingChange: setSorting, onColumnVisibilityChange: setColumnVisibility, onPaginationChange,
    state: { sorting, columnVisibility, pagination },
  });
  const { rows: renderedRows, isRetainingResolvedRows } = useRetainedDataTableRows({ rows: table.getRowModel().rows, status: queryStatus });
  const sizeClassName = (id: string) => dataTableColumnSizeClassNames[id === "store" ? "primary" : "standard"];
  const placeholderColumns = table.getVisibleLeafColumns().map(({ id }) => ({ id, className: cn(sizeClassName(id), id === "store" && stickyStoreCellClassName) }));
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  return (
    <div className="space-y-3">
      <div className="flex justify-end" inert={loading ? true : undefined}><DataTableColumnVisibility table={table} labels={columnLabels} /></div>
      <div ref={tableFrameRef} className={dataTableFrameClassName} aria-busy={loading} inert={loading ? true : undefined}>
        <Table className={dataTableClassName}>
          <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => (
            <TableHead key={header.id} className={cn(sizeClassName(header.column.id), header.column.id === "store" && stickyStoreHeaderClassName)}>
              {header.isPlaceholder ? null : <table.FlexRender header={header} />}
            </TableHead>
          ))}</TableRow>)}</TableHeader>
          <TableBody ref={tableBodyRef}>
            {!adaptivePagination ? (
              <TableRow ref={rowMeasurementRef} aria-hidden="true" data-adaptive-table-measurement-row className="pointer-events-none invisible hover:bg-transparent"><TableCell colSpan={visibleColumnCount}><div className="h-8" /></TableCell></TableRow>
            ) : queryStatus === "ERROR" || (loading && !isRetainingResolvedRows) ? (
              <DataTablePlaceholderRows columns={placeholderColumns} rowCount={pagination.pageSize} hidden={queryStatus === "ERROR"} />
            ) : renderedRows.length ? renderedRows.map((row, index) => (
              <TableRow key={row.id} ref={index === 0 ? rowMeasurementRef : undefined} aria-hidden={(isRetainingResolvedRows && pendingMode === "mask-content") || undefined} className={isRetainingResolvedRows ? "cursor-default hover:bg-transparent" : undefined}>
                {row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cn(sizeClassName(cell.column.id), cell.column.id === "store" && stickyStoreCellClassName)}>
                  <DataTableLoadingCellContent loading={isRetainingResolvedRows} pendingMode={pendingMode}><table.FlexRender cell={cell} /></DataTableLoadingCellContent>
                </TableCell>)}
              </TableRow>
            )) : <TableRow><TableCell colSpan={visibleColumnCount} className="h-24 text-center text-muted-foreground">当前筛选范围内没有环境数据。</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div ref={paginationRef} aria-busy={loading} aria-hidden={!adaptivePagination} className={cn("flex flex-wrap items-center justify-between gap-3", !adaptivePagination && "invisible")}>
        <p className="text-sm text-muted-foreground">共 <DataTablePendingValue pending={isResolvedMetadataPending}>{tableRows.length}</DataTablePendingValue> 家门店</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">第 <DataTablePendingValue pending={isResolvedMetadataPending}>{pagination.pageIndex + 1}</DataTablePendingValue> / <DataTablePendingValue pending={isResolvedMetadataPending}>{Math.max(table.getPageCount(), 1)}</DataTablePendingValue> 页</span>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={loading || !table.getCanPreviousPage()}>上一页</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={loading || !table.getCanNextPage()}>下一页</Button>
        </div>
      </div>
      <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-xl!">
          <SheetHeader><SheetTitle>环境详情</SheetTitle><SheetDescription>{detail?.itemName ?? ""}</SheetDescription></SheetHeader>
          {detail ? <EnvironmentDetailContent detail={detail} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
