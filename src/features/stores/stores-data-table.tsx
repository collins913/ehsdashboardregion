"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import {
  columnVisibilityFeature,
  type ColumnVisibilityState,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  sortFn_text,
  tableFeatures as defineTableFeatures,
  useTable,
} from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import {
  DataTableLoadingCellContent,
  DataTablePendingValue,
  useResolvedDataTableSnapshot,
  useRetainedDataTableRows,
} from "@/components/shared/data-table-loading";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import {
  dataTableColumnContentClassNames,
  dataTableColumnSizeClassNames,
  dataTableClassName,
  dataTableFrameClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
  type DataTableColumnSizeRole,
} from "@/components/shared/data-table-layout";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NormalizedStoreRecord } from "@/data/contracts/stores";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  clampTablePageIndex,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";

const storesTableFeatures = defineTableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

type StoresTableFeatures = typeof storesTableFeatures;
const columnHelper =
  createColumnHelper<StoresTableFeatures, NormalizedStoreRecord>();

const columnLabels: Record<string, string> = {
  store: "门店",
  region: "区域",
  area: "小区",
  trtid: "TRTID",
  manager: "门店经理",
  ehsAmbassador: "EHS&S 代表",
};

export const STORE_COLUMN_SIZE_ROLES = {
  store: "primary",
  region: "standard",
  area: "standard",
  trtid: "compact",
  manager: "standard",
  ehsAmbassador: "standard",
} satisfies Record<string, DataTableColumnSizeRole>;

function storeColumnSizeClassName(columnId: string) {
  const role = STORE_COLUMN_SIZE_ROLES[
    columnId as keyof typeof STORE_COLUMN_SIZE_ROLES
  ];

  return role ? dataTableColumnSizeClassNames[role] : undefined;
}

export const DEFAULT_VISIBLE_STORE_COLUMN_IDS = [
  "store",
  "region",
  "area",
  "trtid",
  "manager",
  "ehsAmbassador",
] as const;

type StoresPaginationState =
  | { status: "UNMEASURED" }
  | { status: "READY"; pagination: AdaptivePagination };

const unmeasuredTablePagination: PaginationState = {
  pageIndex: 0,
  pageSize: 1,
};

export function getStoreRowId(record: NormalizedStoreRecord) {
  return record.storeId;
}

export function isStoreRowActivationKey(key: string) {
  return key === "Enter" || key === " ";
}

function displayValue(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

export function StoreDetailContent({
  record,
}: {
  record: NormalizedStoreRecord;
}) {
  const fields = [
    ["中文门店名", record.storeNameCn],
    ["英文门店名", record.storeNameEn],
    ["TRTID", record.trtid],
    ["区域", record.region],
    ["小区", record.area],
  ] as const;
  const contacts = [
    ["区域负责人", record.regionOwner, record.regionOwnerEmail],
    ["小区负责人", record.areaOwner, record.areaOwnerEmail],
    ["门店经理", record.manager, record.managerEmail],
    ["EHS&S 代表", record.ehsAmbassador, record.ehsAmbassadorEmail],
  ] as const;

  return (
    <div className="px-4 pb-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words">{displayValue(value)}</dd>
          </div>
        ))}
        {contacts.map(([label, name, email]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words">{displayValue(name)}</dd>
            <dd className="break-all text-sm text-muted-foreground">{displayValue(email)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StoreDetailSheet({
  record,
  open,
  onOpenChange,
}: {
  record: NormalizedStoreRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>门店详情</SheetTitle>
          <SheetDescription>{record?.storeNameCn ?? ""}</SheetDescription>
        </SheetHeader>
        {record ? <StoreDetailContent record={record} /> : null}
      </SheetContent>
    </Sheet>
  );
}

export function StoresDataTable({
  rows,
  queryKey = "stores",
  queryStatus = "READY",
}: {
  rows: readonly NormalizedStoreRecord[];
  queryKey?: string;
  queryStatus?: "READY" | "LOADING" | "ERROR";
}) {
  const [selectedRecord, setSelectedRecord] =
    useState<NormalizedStoreRecord | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [paginationState, setPaginationState] =
    useState<StoresPaginationState>({ status: "UNMEASURED" });
  const isQueryLoading = queryStatus === "LOADING";
  const {
    snapshot: resolvedRows,
    isResolvedMetadataPending,
  } = useResolvedDataTableSnapshot({
    snapshot: rows,
    status: queryStatus,
    metadataKey: queryKey,
  });
  const tableRows = resolvedRows ?? [];
  useLayoutEffect(() => {
    if (isQueryLoading) {
      setSelectedRecord(null);
      setDetailOpen(false);
    }
  }, [isQueryLoading]);
  const isPaginationReady = paginationState.status === "READY";
  const pagination = useMemo<PaginationState>(() => {
    if (paginationState.status === "UNMEASURED") {
      return unmeasuredTablePagination;
    }

    return {
      pageIndex: clampTablePageIndex(
        paginationState.pagination.pageIndex,
        tableRows.length,
        paginationState.pagination.pageSize,
      ),
      pageSize: paginationState.pagination.pageSize,
    };
  }, [paginationState, tableRows.length]);
  const handleAdaptivePageSizeChange = useCallback(
    (pageSize: AdaptiveTablePageSize) => {
      setPaginationState((current) => {
        const currentPagination =
          current.status === "READY"
            ? current.pagination
            : { pageIndex: 0, pageSize };
        const nextPagination = paginationForPageSize(
          currentPagination,
          tableRows.length,
          pageSize,
        );

        return current.status === "READY" &&
          current.pagination.pageIndex === nextPagination.pageIndex &&
          current.pagination.pageSize === nextPagination.pageSize
          ? current
          : { status: "READY", pagination: nextPagination };
      });
    },
    [tableRows.length],
  );
  const handlePaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      setPaginationState((current) => {
        if (current.status === "UNMEASURED") {
          return current;
        }

        const currentPagination: PaginationState = {
          pageIndex: clampTablePageIndex(
            current.pagination.pageIndex,
            tableRows.length,
            current.pagination.pageSize,
          ),
          pageSize: current.pagination.pageSize,
        };
        const proposedPagination =
          typeof updater === "function" ? updater(currentPagination) : updater;
        const nextPagination: AdaptivePagination = {
          pageIndex: clampTablePageIndex(
            proposedPagination.pageIndex,
            tableRows.length,
            current.pagination.pageSize,
          ),
          pageSize: current.pagination.pageSize,
        };

        return current.pagination.pageIndex === nextPagination.pageIndex
          ? current
          : { status: "READY", pagination: nextPagination };
      });
    },
    [tableRows.length],
  );
  const {
    tableFrameRef,
    tableBodyRef,
    rowMeasurementRef,
    paginationRef,
  } = useAdaptiveTablePageSize({
    ready: isPaginationReady,
    currentPageSize:
      paginationState.status === "READY"
        ? paginationState.pagination.pageSize
        : null,
    onPageSizeChange: handleAdaptivePageSizeChange,
  });

  useLayoutEffect(() => {
    setPaginationState((current) => {
      if (current.status === "UNMEASURED") {
        return current;
      }

      const pageIndex = clampTablePageIndex(
        current.pagination.pageIndex,
        tableRows.length,
        current.pagination.pageSize,
      );

      return pageIndex === current.pagination.pageIndex
        ? current
        : {
            status: "READY",
            pagination: { ...current.pagination, pageIndex },
          };
    });
  }, [tableRows.length]);

  const openDetail = useCallback((record: NormalizedStoreRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  }, []);
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("storeNameCn", {
          id: "store",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.store} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={cn(
                dataTableColumnContentClassNames.primary,
                "font-medium",
              )}
            />
          ),
          enableHiding: false,
          sortFn: "text",
        }),
        columnHelper.accessor("region", {
          id: "region",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.region} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={displayValue(getValue())}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("area", {
          id: "area",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.area} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={displayValue(getValue())}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("trtid", {
          id: "trtid",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.trtid} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={displayValue(getValue())}
              className={dataTableColumnContentClassNames.compact}
              focusable={false}
            />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("manager", {
          id: "manager",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.manager} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={displayValue(getValue())}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("ehsAmbassador", {
          id: "ehsAmbassador",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={columnLabels.ehsAmbassador}
            />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={displayValue(getValue())}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
          sortFn: "text",
        }),
      ]),
    [],
  );
  const table = useTable({
    features: storesTableFeatures,
    columns,
    data: tableRows,
    getRowId: getStoreRowId,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    state: { sorting, columnVisibility, pagination },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const displayedRows = table.getRowModel().rows;
  const {
    rows: renderedRows,
    isRetainingResolvedRows,
  } = useRetainedDataTableRows({
    rows: displayedRows,
    status:
      queryStatus === "READY"
        ? "READY"
        : queryStatus === "ERROR"
          ? "ERROR"
          : "LOADING",
  });
  const placeholderColumns = table.getVisibleLeafColumns().map((column) => ({
    id: column.id,
    className: cn(
      storeColumnSizeClassName(column.id),
      column.id === "store" && stickyStoreCellClassName,
    ),
  }));

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    record: NormalizedStoreRecord,
  ) => {
    if (
      event.target === event.currentTarget &&
      isStoreRowActivationKey(event.key)
    ) {
      event.preventDefault();
      openDetail(record);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="flex justify-end"
        inert={isQueryLoading ? true : undefined}
      >
        <DataTableColumnVisibility table={table} labels={columnLabels} />
      </div>

      <div
        ref={tableFrameRef}
        className={dataTableFrameClassName}
        aria-busy={isQueryLoading}
        inert={isQueryLoading ? true : undefined}
      >
        <Table className={dataTableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      storeColumnSizeClassName(header.column.id),
                      header.column.id === "store" &&
                        stickyStoreHeaderClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody ref={tableBodyRef}>
            {!isPaginationReady ? (
              <TableRow
                ref={rowMeasurementRef}
                aria-hidden="true"
                data-adaptive-table-measurement-row
                className="pointer-events-none invisible hover:bg-transparent"
              >
                <TableCell colSpan={visibleColumnCount}>
                  <div className="h-8" />
                </TableCell>
              </TableRow>
            ) : queryStatus === "ERROR" ||
              (isQueryLoading && !isRetainingResolvedRows) ? (
              <DataTablePlaceholderRows
                columns={placeholderColumns}
                rowCount={pagination.pageSize}
                hidden={queryStatus === "ERROR"}
              />
            ) : renderedRows.length > 0 ? (
              renderedRows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  ref={rowIndex === 0 ? rowMeasurementRef : undefined}
                  role="button"
                  tabIndex={isRetainingResolvedRows ? -1 : 0}
                  aria-hidden={isRetainingResolvedRows || undefined}
                  aria-label={`查看门店 ${row.original.storeNameCn}`}
                  className={cn(
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isRetainingResolvedRows
                      ? "cursor-default hover:bg-transparent"
                      : "cursor-pointer",
                  )}
                  onClick={
                    isRetainingResolvedRows
                      ? undefined
                      : () => openDetail(row.original)
                  }
                  onKeyDown={
                    isRetainingResolvedRows
                      ? undefined
                      : (event) => handleRowKeyDown(event, row.original)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        storeColumnSizeClassName(cell.column.id),
                        cell.column.id === "store" &&
                          stickyStoreCellClassName,
                      )}
                    >
                      <DataTableLoadingCellContent
                        loading={isRetainingResolvedRows}
                      >
                        <table.FlexRender cell={cell} />
                      </DataTableLoadingCellContent>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  当前筛选范围内没有门店。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div
        ref={paginationRef}
        aria-busy={isQueryLoading}
        aria-hidden={!isPaginationReady}
        className={`flex flex-wrap items-center justify-between gap-3${
          isPaginationReady ? "" : " invisible"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          共{" "}
          <DataTablePendingValue pending={isResolvedMetadataPending}>
            {tableRows.length}
          </DataTablePendingValue>{" "}
          家门店
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            第{" "}
            <DataTablePendingValue pending={isResolvedMetadataPending}>
              {table.state.pagination.pageIndex + 1}
            </DataTablePendingValue>{" "}
            /{" "}
            <DataTablePendingValue pending={isResolvedMetadataPending}>
              {Math.max(table.getPageCount(), 1)}
            </DataTablePendingValue>{" "}
            页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={isQueryLoading || !table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={isQueryLoading || !table.getCanNextPage()}
          >
            下一页
          </Button>
        </div>
      </div>

      <StoreDetailSheet
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
