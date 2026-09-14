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

function displayValue(value: string) {
  return value.trim().length > 0 ? value : "—";
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
    ["门店经理", record.manager],
    ["EHS&S 代表", record.ehsAmbassador],
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
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
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
}: {
  rows: readonly NormalizedStoreRecord[];
}) {
  const [selectedRecord, setSelectedRecord] =
    useState<NormalizedStoreRecord | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [paginationState, setPaginationState] =
    useState<StoresPaginationState>({ status: "UNMEASURED" });
  const isPaginationReady = paginationState.status === "READY";
  const pagination = useMemo<PaginationState>(() => {
    if (paginationState.status === "UNMEASURED") {
      return unmeasuredTablePagination;
    }

    return {
      pageIndex: clampTablePageIndex(
        paginationState.pagination.pageIndex,
        rows.length,
        paginationState.pagination.pageSize,
      ),
      pageSize: paginationState.pagination.pageSize,
    };
  }, [paginationState, rows.length]);
  const handleAdaptivePageSizeChange = useCallback(
    (pageSize: AdaptiveTablePageSize) => {
      setPaginationState((current) => {
        const currentPagination =
          current.status === "READY"
            ? current.pagination
            : { pageIndex: 0, pageSize };
        const nextPagination = paginationForPageSize(
          currentPagination,
          rows.length,
          pageSize,
        );

        return current.status === "READY" &&
          current.pagination.pageIndex === nextPagination.pageIndex &&
          current.pagination.pageSize === nextPagination.pageSize
          ? current
          : { status: "READY", pagination: nextPagination };
      });
    },
    [rows.length],
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
            rows.length,
            current.pagination.pageSize,
          ),
          pageSize: current.pagination.pageSize,
        };
        const proposedPagination =
          typeof updater === "function" ? updater(currentPagination) : updater;
        const nextPagination: AdaptivePagination = {
          pageIndex: clampTablePageIndex(
            proposedPagination.pageIndex,
            rows.length,
            current.pagination.pageSize,
          ),
          pageSize: current.pagination.pageSize,
        };

        return current.pagination.pageIndex === nextPagination.pageIndex
          ? current
          : { status: "READY", pagination: nextPagination };
      });
    },
    [rows.length],
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
        rows.length,
        current.pagination.pageSize,
      );

      return pageIndex === current.pagination.pageIndex
        ? current
        : {
            status: "READY",
            pagination: { ...current.pagination, pageIndex },
          };
    });
  }, [rows.length]);

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
    data: rows,
    getRowId: getStoreRowId,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    state: { sorting, columnVisibility, pagination },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const displayedRows = table.getRowModel().rows;

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
      <div className="flex justify-end">
        <DataTableColumnVisibility table={table} labels={columnLabels} />
      </div>

      <div ref={tableFrameRef} className={dataTableFrameClassName}>
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
            ) : displayedRows.length > 0 ? (
              displayedRows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  ref={rowIndex === 0 ? rowMeasurementRef : undefined}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看门店 ${row.original.storeNameCn}`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => openDetail(row.original)}
                  onKeyDown={(event) => handleRowKeyDown(event, row.original)}
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
                      <table.FlexRender cell={cell} />
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
        aria-hidden={!isPaginationReady}
        className={`flex flex-wrap items-center justify-between gap-3${
          isPaginationReady ? "" : " invisible"
        }`}
      >
        <p className="text-sm text-muted-foreground">共 {rows.length} 家门店</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            第 {table.state.pagination.pageIndex + 1} /{" "}
            {Math.max(table.getPageCount(), 1)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
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
