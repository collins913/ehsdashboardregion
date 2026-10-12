"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  columnVisibilityFeature, type ColumnVisibilityState, createColumnHelper,
  createPaginatedRowModel, createSortedRowModel,
  type PaginationState, rowPaginationFeature, rowSortingFeature,
  type SortingState, sortFn_text, tableFeatures as defineTableFeatures, useTable,
} from "@tanstack/react-table";
import { DataTableColumnHeader, getColumnAriaSort } from "@/components/shared/data-table-column-header";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import { DataTableLoadingCellContent, DataTablePendingValue, useResolvedDataTableSnapshot, useRetainedDataTableRows } from "@/components/shared/data-table-loading";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import {
  dataTableColumnContentClassNames, dataTableColumnSizeClassNames, dataTableClassName,
  dataTableFrameClassName, dataTableRowClassName, stickyStoreCellClassName, stickyStoreHeaderClassName,
} from "@/components/shared/data-table-layout";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import {
  type AdaptivePagination, type AdaptiveTablePageSize, clampTablePageIndex,
  clampAdaptivePagination, resizeAdaptivePagination, updateAdaptivePagination, useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";
import { EnvironmentDetailSheet } from "./environment-detail-sheet";
import {
  buildEnvironmentDetail,
  ENVIRONMENT_DETAILS,
  type EnvironmentDetail,
  type EnvironmentDetailKind,
} from "./environment-view-model";

const environmentTableFeatures = defineTableFeatures({
  columnVisibilityFeature, rowPaginationFeature, rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});
const columnHelper = createColumnHelper<typeof environmentTableFeatures, NormalizedEnvironmentRecord>();
const columnLabels = Object.fromEntries([
  ["store", "门店"],
  ...ENVIRONMENT_DETAILS.map(({ kind, label }) => [kind, label]),
]);

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
    setAdaptivePagination((current) => resizeAdaptivePagination(current, tableRows.length, pageSize));
  }, [tableRows.length]);
  const onPaginationChange = useCallback((updater: PaginationState | ((current: PaginationState) => PaginationState)) => {
    setAdaptivePagination((current) => current ? updateAdaptivePagination(current, updater, tableRows.length) : current);
  }, [tableRows.length]);
  const { tableFrameRef, tableBodyRef, rowMeasurementRef, paginationRef } = useAdaptiveTablePageSize({
    ready: adaptivePagination !== null, currentPageSize: adaptivePagination?.pageSize ?? null, onPageSizeChange,
  });
  useLayoutEffect(() => { if (queryStatus !== "READY") setDetail(null); }, [queryStatus]);
  useLayoutEffect(() => {
    setAdaptivePagination((current) => {
      return current ? clampAdaptivePagination(current, tableRows.length) : current;
    });
  }, [tableRows.length]);
  const openDetail = useCallback((record: NormalizedEnvironmentRecord, kind: EnvironmentDetailKind) => {
    setDetail(buildEnvironmentDetail(record, kind));
  }, []);
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor("storeDisplayName", {
      id: "store", header: ({ column }) => <DataTableColumnHeader column={column} title="门店" />,
      cell: ({ getValue }) => <OverflowTooltip text={getValue()} className={cn(dataTableColumnContentClassNames.primary, "font-medium")} />,
      enableHiding: false, sortFn: "text",
    }),
    ...ENVIRONMENT_DETAILS.map(({ kind, label }) => columnHelper.display({
      id: kind, header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
      cell: ({ row }) => (
        <TableCellTrigger aria-label={`查看${row.original.storeDisplayName}的${label}详情`} onClick={() => openDetail(row.original, kind)}>
          查看
        </TableCellTrigger>
      ),
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
            <TableHead key={header.id} aria-sort={getColumnAriaSort(header.column)} className={cn(sizeClassName(header.column.id), header.column.id === "store" && stickyStoreHeaderClassName)}>
              {header.isPlaceholder ? null : <table.FlexRender header={header} />}
            </TableHead>
          ))}</TableRow>)}</TableHeader>
          <TableBody ref={tableBodyRef}>
            {!adaptivePagination ? (
              <TableRow ref={rowMeasurementRef} aria-hidden="true" data-adaptive-table-measurement-row className="pointer-events-none invisible hover:bg-transparent"><TableCell colSpan={visibleColumnCount}><div className="h-8" /></TableCell></TableRow>
            ) : queryStatus === "ERROR" || (loading && !isRetainingResolvedRows) ? (
              <DataTablePlaceholderRows columns={placeholderColumns} rowCount={pagination.pageSize} hidden={queryStatus === "ERROR"} />
            ) : renderedRows.length ? renderedRows.map((row, index) => (
              <TableRow key={row.id} ref={index === 0 ? rowMeasurementRef : undefined} aria-hidden={(isRetainingResolvedRows && pendingMode === "mask-content") || undefined} className={cn(!isRetainingResolvedRows && dataTableRowClassName, isRetainingResolvedRows && "cursor-default hover:bg-transparent")}>
                {row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cn(sizeClassName(cell.column.id), cell.column.id === "store" && stickyStoreCellClassName)}>
                  <DataTableLoadingCellContent loading={isRetainingResolvedRows} pendingMode={pendingMode}><table.FlexRender cell={cell} /></DataTableLoadingCellContent>
                </TableCell>)}
              </TableRow>
            )) : <TableRow><TableCell colSpan={visibleColumnCount} className="h-24 text-center text-muted-foreground">当前筛选范围内没有环境数据。</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        ref={paginationRef}
        ready={adaptivePagination !== null}
        busy={loading}
        disabled={loading}
        pageIndex={pagination.pageIndex}
        pageCount={Math.max(table.getPageCount(), 1)}
        metadataPending={isResolvedMetadataPending}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
      >
        <p className="text-sm text-muted-foreground">共 <DataTablePendingValue pending={isResolvedMetadataPending}>{tableRows.length}</DataTablePendingValue> 家门店</p>
      </DataTablePagination>
      <EnvironmentDetailSheet detail={detail} onOpenChange={(open) => { if (!open) setDetail(null); }} />
    </div>
  );
}
