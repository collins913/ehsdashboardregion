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
import { FilterSelect } from "@/components/shared/filter-select";
import { DataTableLoadingCellContent, DataTablePendingValue, useResolvedDataTableSnapshot, useRetainedDataTableRows } from "@/components/shared/data-table-loading";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import {
  dataTableColumnContentClassNames, dataTableColumnAlignmentClassNames, dataTableColumnSizeClassNames, dataTableClassName,
  dataTableFrameClassName, dataTableRowClassName, stickyStoreCellClassName, stickyStoreHeaderClassName,
} from "@/components/shared/data-table-layout";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import { StatusDisplay } from "@/components/shared/status-display";
import { DetailAccordion, DetailAccordionItem } from "@/components/shared/detail-accordion";
import { DetailHeader } from "@/components/shared/detail-header";
import { DetailRecordCard } from "@/components/shared/detail-record-card";
import { DetailField } from "@/components/shared/detail-field";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CertificatesTableRow } from "./certificates-view-model";

import {
  type AdaptivePagination, type AdaptiveTablePageSize, clampTablePageIndex,
  clampAdaptivePagination, resizeAdaptivePagination, updateAdaptivePagination, useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";
import { buildCertificatesDetail, CERTIFICATES_ITEMS, DEFAULT_CERTIFICATES_VIEW_MODE, filterCertificatesTableRows, type CertificatesDetail, type CertificatesItemKey, type CertificatesViewMode } from "./certificates-view-model";

const certificatesTableFeatures = defineTableFeatures({
  columnVisibilityFeature, rowPaginationFeature, rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});
const columnHelper = createColumnHelper<typeof certificatesTableFeatures, CertificatesTableRow>();
const columnLabels = Object.fromEntries([ ["store", "门店"], ...CERTIFICATES_ITEMS.map(({ key, label }) => [key, label]) ]);

export function CertificatesDetailContent({ detail }: { detail: CertificatesDetail }) {
  return (
    <div className="min-w-0 px-4 pb-4">
      <DetailAccordion>
        {detail.groups.map((group) => (
          <DetailAccordionItem
            key={group.certificateType}
            value={group.certificateType}
            title={group.label}
            count={group.count}
            disabled={group.disabled}
            attention={group.hasAbnormalRecords}
            contentClassName="space-y-3"
          >
              {group.records.map((record, index) => (
                <DetailRecordCard key={`${record.certificateType}-${record.personEmail}-${index}`}>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 break-words text-base font-medium">{record.person}</p>
                          <StatusDisplay status={record.certificateStatus} className="shrink-0" />
                        </div>
                        <p className="break-all text-sm text-muted-foreground">{record.personEmail}</p>
                      </div>
                      <dl>
                        <DetailField label="岗位" valueClassName="whitespace-normal text-sm">{record.businessTitle}</DetailField>
                      </dl>
                      <dl className="grid grid-cols-2 gap-4">
                        <DetailField label="到期日期" valueClassName="whitespace-normal text-sm">{record.expiryDate || "—"}</DetailField>
                        <DetailField label="距离到期" valueClassName="whitespace-normal break-normal text-sm">{record.daysUntilExpiry === null ? "—" : `${record.daysUntilExpiry} 天`}</DetailField>
                      </dl>
                    </div>
                </DetailRecordCard>
              ))}
          </DetailAccordionItem>
        ))}
      </DetailAccordion>
    </div>
  );
}

export function CertificatesDataTable({ rows, queryKey, queryStatus }: {
  rows: readonly CertificatesTableRow[];
  queryKey: string;
  queryStatus: "READY" | "LOADING" | "ERROR";
}) {
  const [detail, setDetail] = useState<CertificatesDetail | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [viewMode, setViewMode] = useState<CertificatesViewMode>(DEFAULT_CERTIFICATES_VIEW_MODE);
  const [adaptivePagination, setAdaptivePagination] = useState<AdaptivePagination | null>(null);
  const loading = queryStatus === "LOADING";
  const { snapshot, isResolvedMetadataPending, pendingMode } = useResolvedDataTableSnapshot({ snapshot: rows, status: queryStatus, metadataKey: queryKey });
  const tableRows = useMemo(
    () => filterCertificatesTableRows(snapshot ?? [], viewMode),
    [snapshot, viewMode],
  );
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
  const openDetail = useCallback((record: CertificatesTableRow, key: CertificatesItemKey) => setDetail(buildCertificatesDetail(record, key)), []);
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor("storeDisplayName", {
      id: "store", header: ({ column }) => <DataTableColumnHeader column={column} title="门店" />,
      cell: ({ getValue }) => <OverflowTooltip text={getValue()} className={cn(dataTableColumnContentClassNames.primary, "font-medium")} />,
      enableHiding: false, sortFn: "text",
    }),
    ...CERTIFICATES_ITEMS.map(({ key, label }) => columnHelper.accessor(key, {
      id: key, header: ({ column }) => <DataTableColumnHeader column={column} title={label} align="center" />,
      cell: ({ row, getValue }) => (
        <TableCellTrigger aria-label={`查看${row.original.storeDisplayName}的${label}详情`} onClick={() => openDetail(row.original, key)}>
          <StatusDisplay status={getValue()} interactive />
        </TableCellTrigger>
      ), sortFn: "text",
    })),
  ]), [openDetail]);
  const table = useTable({ features: certificatesTableFeatures, columns, data: tableRows, getRowId: (record) => record.storeId,
    onSortingChange: setSorting, onColumnVisibilityChange: setColumnVisibility, onPaginationChange,
    state: { sorting, columnVisibility, pagination },
  });
  const { rows: renderedRows, isRetainingResolvedRows } = useRetainedDataTableRows({ rows: table.getRowModel().rows, status: queryStatus });
  const sizeClassName = (id: string) => cn(dataTableColumnSizeClassNames[id === "store" ? "primary" : "standard"], dataTableColumnAlignmentClassNames[id === "store" ? "left" : "center"]);
  const placeholderColumns = table.getVisibleLeafColumns().map(({ id }) => ({ id, className: cn(sizeClassName(id), id === "store" && stickyStoreCellClassName) }));
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3" inert={loading ? true : undefined}>
        <FilterSelect
          ariaLabel="证件结果筛选"
          value={viewMode}
          options={[
            { value: "ALL", label: "全部" },
            { value: "ABNORMAL_ONLY", label: "异常" },
          ]}
          disabled={loading}
          onValueChange={(nextViewMode) => {
            setViewMode(nextViewMode);
            setAdaptivePagination((current) =>
              current ? { ...current, pageIndex: 0 } : current,
            );
          }}
        />
        <DataTableColumnVisibility table={table} labels={columnLabels} />
      </div>
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
            )) : <TableRow><TableCell colSpan={visibleColumnCount} className="h-24 text-center text-muted-foreground">当前筛选范围内没有证件数据。</TableCell></TableRow>}
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
      <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <SheetContent className="overflow-y-auto">
          <DetailHeader
            title={detail?.certificateCategory ?? "证件详情"}
            subtitle={detail?.storeDisplayName ?? ""}
            resultLabel="当前结果"
            result={detail ? <StatusDisplay status={detail.status} /> : undefined}
          />
          {detail ? <CertificatesDetailContent detail={detail} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
