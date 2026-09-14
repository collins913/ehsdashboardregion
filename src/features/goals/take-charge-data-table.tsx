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
  type OnChangeFn,
  type PaginationState,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures as defineTableFeatures,
  useTable,
} from "@tanstack/react-table";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
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
import { StatusDisplay } from "@/components/shared/status-display";
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
import type { KpiFilterContext } from "@/data/contracts/kpi";
import type {
  NormalizedTakeChargeRecord,
  TakeChargeExtraFieldValue,
  TakeChargeFieldDefinition,
  TakeChargeRecordsResult,
  TakeChargeSortKey,
  TakeChargeViewMode,
} from "@/data/contracts/take-charge";
import type { EhsRepository } from "@/data/repositories";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

const takeChargeTableFeatures = defineTableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
});

type TakeChargeTableFeatures = typeof takeChargeTableFeatures;
const columnHelper =
  createColumnHelper<TakeChargeTableFeatures, NormalizedTakeChargeRecord>();

const coreColumnLabels: Record<string, string> = {
  store: "门店",
  tchId: "TCH 编号",
  submittedBy: "提交人",
  submittedAt: "提交时间",
  summary: "摘要",
  status: "状态",
};

export const TAKE_CHARGE_COLUMN_SIZE_ROLES = {
  store: "primary",
  tchId: "compact",
  submittedBy: "standard",
  submittedAt: "compact",
  summary: "content",
  status: "standard",
} satisfies Record<string, DataTableColumnSizeRole>;

function takeChargeColumnSizeRole(columnId: string): DataTableColumnSizeRole {
  return (
    TAKE_CHARGE_COLUMN_SIZE_ROLES[
      columnId as keyof typeof TAKE_CHARGE_COLUMN_SIZE_ROLES
    ] ?? "standard"
  );
}

function takeChargeColumnSizeClassName(columnId: string) {
  return dataTableColumnSizeClassNames[takeChargeColumnSizeRole(columnId)];
}

export const DEFAULT_VISIBLE_TAKE_CHARGE_COLUMN_IDS = [
  "store",
  "tchId",
  "submittedBy",
  "submittedAt",
  "summary",
  "status",
] as const;
export const DEFAULT_TAKE_CHARGE_VIEW_MODE: TakeChargeViewMode = "OPEN_ONLY";

export function getTakeChargeRowId(
  record: NormalizedTakeChargeRecord,
): string {
  return record.tchId;
}

type GoalsRepository = Pick<EhsRepository, "getTakeChargeRecords">;
type PaginationReadiness =
  | { status: "UNMEASURED" }
  | { status: "READY"; pagination: AdaptivePagination };

const unmeasuredPagination: PaginationState = { pageIndex: 0, pageSize: 1 };

export function resetTakeChargePageIndex(
  pagination: AdaptivePagination,
): AdaptivePagination {
  return pagination.pageIndex === 0
    ? pagination
    : { ...pagination, pageIndex: 0 };
}

function formatExtraValue(value: TakeChargeExtraFieldValue): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function statusLabel(record: NormalizedTakeChargeRecord): string | undefined {
  return record.recordState === "UNKNOWN" ? undefined : record.sourceStatus;
}

export function TakeChargeDetailContent({
  record,
}: {
  record: NormalizedTakeChargeRecord;
}) {
  return (
    <div className="space-y-6 px-4 pb-4">
      <section className="space-y-3">
        <h3 className="font-medium">基本信息</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">门店</dt>
            <dd className="mt-1">{record.storeDisplayName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">TCH 编号</dt>
            <dd className="mt-1">{record.tchId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">状态</dt>
            <dd className="mt-1">
              <StatusDisplay
                status={record.recordState}
                label={statusLabel(record)}
              />
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">建议摘要</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {record.summary}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">人员与时间</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">提交人</dt>
            <dd className="mt-1">{record.submittedBy}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">提交时间</dt>
            <dd className="mt-1">
              {formatBusinessDateTime(record.submittedAt)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function TakeChargeDetailSheet({
  record,
  open,
  onOpenChange,
}: {
  record: NormalizedTakeChargeRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
        <SheetHeader>
          <SheetTitle>Take Charge 详情</SheetTitle>
          <SheetDescription>
            {record ? `${record.storeDisplayName} · ${record.tchId}` : ""}
          </SheetDescription>
        </SheetHeader>
        {record ? <TakeChargeDetailContent record={record} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function createColumns(fieldDefinitions: readonly TakeChargeFieldDefinition[]) {
  return columnHelper.columns([
    columnHelper.accessor("storeDisplayName", {
      id: "store",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={coreColumnLabels.store} />
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
    }),
    columnHelper.accessor("tchId", {
      id: "tchId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={coreColumnLabels.tchId} />
      ),
      cell: ({ getValue }) => (
        <OverflowTooltip
          text={getValue()}
          className={cn(
            dataTableColumnContentClassNames.compact,
            "font-medium",
          )}
          focusable={false}
        />
      ),
    }),
    columnHelper.accessor("submittedBy", {
      id: "submittedBy",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={coreColumnLabels.submittedBy}
        />
      ),
      cell: ({ getValue }) => (
        <OverflowTooltip
          text={getValue()}
          className={dataTableColumnContentClassNames.standard}
          focusable={false}
        />
      ),
    }),
    columnHelper.accessor(
      (row) => formatBusinessDate(row.submittedAt),
      {
        id: "submittedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={coreColumnLabels.submittedAt}
          />
        ),
      },
    ),
    columnHelper.accessor("summary", {
      id: "summary",
      header: coreColumnLabels.summary,
      enableSorting: false,
      cell: ({ getValue }) => (
        <OverflowTooltip
          text={getValue()}
          className={dataTableColumnContentClassNames.content}
          focusable={false}
        />
      ),
    }),
    columnHelper.accessor("sourceStatus", {
      id: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={coreColumnLabels.status} />
      ),
      cell: ({ row }) => (
        <StatusDisplay
          status={row.original.recordState}
          label={statusLabel(row.original)}
        />
      ),
    }),
    ...fieldDefinitions.map((definition) =>
      columnHelper.accessor(
        (row) => formatExtraValue(row.extraFields[definition.key] ?? null),
        {
          id: `extra:${definition.key}`,
          header: definition.label,
          enableSorting: false,
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
        },
      ),
    ),
  ]);
}

export function TakeChargeDataTable({
  context,
  repository,
}: {
  context: KpiFilterContext;
  repository: GoalsRepository;
}) {
  const [selectedRecord, setSelectedRecord] =
    useState<NormalizedTakeChargeRecord | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<TakeChargeViewMode>(
    DEFAULT_TAKE_CHARGE_VIEW_MODE,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [paginationState, setPaginationState] = useState<PaginationReadiness>({
    status: "UNMEASURED",
  });
  const isPaginationReady = paginationState.status === "READY";
  const pagination =
    paginationState.status === "READY"
      ? paginationState.pagination
      : unmeasuredPagination;
  const result = useMemo<TakeChargeRecordsResult | null>(
    () =>
      paginationState.status === "READY"
        ? repository.getTakeChargeRecords({
            context,
            viewMode,
            sorting:
              sorting.length === 0
                ? undefined
                : {
                    key: sorting[0].id as TakeChargeSortKey,
                    direction: sorting[0].desc ? "desc" : "asc",
                  },
            pageIndex: paginationState.pagination.pageIndex,
            pageSize: paginationState.pagination.pageSize,
          })
        : null,
    [context, paginationState, repository, sorting, viewMode],
  );
  const fieldDefinitions = result?.fieldDefinitions ?? [];
  const defaultColumnVisibility = useMemo<ColumnVisibilityState>(
    () =>
      Object.fromEntries(
        fieldDefinitions.map((definition) => [
          `extra:${definition.key}`,
          definition.defaultVisible,
        ]),
      ),
    [fieldDefinitions],
  );
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(defaultColumnVisibility);
  const effectiveColumnVisibility = useMemo(
    () => ({ ...defaultColumnVisibility, ...columnVisibility }),
    [columnVisibility, defaultColumnVisibility],
  );
  const totalCount = result?.totalCount ?? 0;
  const handleAdaptivePageSizeChange = useCallback(
    (pageSize: AdaptiveTablePageSize) => {
      setPaginationState((current) => ({
        status: "READY",
        pagination: paginationForPageSize(
          current.status === "READY"
            ? current.pagination
            : { pageIndex: 0, pageSize },
          totalCount,
          pageSize,
        ),
      }));
    },
    [totalCount],
  );
  const handlePaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      setPaginationState((current) => {
        if (current.status !== "READY") return current;
        const proposed =
          typeof updater === "function" ? updater(current.pagination) : updater;
        return {
          status: "READY",
          pagination: {
            pageIndex: Math.max(0, proposed.pageIndex),
            pageSize: current.pagination.pageSize,
          },
        };
      });
    },
    [],
  );
  const { tableFrameRef, tableBodyRef, rowMeasurementRef, paginationRef } =
    useAdaptiveTablePageSize({
      ready: isPaginationReady,
      currentPageSize:
        paginationState.status === "READY"
          ? paginationState.pagination.pageSize
          : null,
      onPageSizeChange: handleAdaptivePageSizeChange,
    });

  useLayoutEffect(() => {
    if (
      result !== null &&
      paginationState.status === "READY" &&
      result.pageIndex !== paginationState.pagination.pageIndex
    ) {
      setPaginationState({
        status: "READY",
        pagination: {
          ...paginationState.pagination,
          pageIndex: result.pageIndex,
        },
      });
    }
  }, [paginationState, result]);

  const columns = useMemo(() => createColumns(fieldDefinitions), [fieldDefinitions]);
  const labels = useMemo(
    () => ({
      ...coreColumnLabels,
      ...Object.fromEntries(
        fieldDefinitions.map((definition) => [
          `extra:${definition.key}`,
          definition.label,
        ]),
      ),
    }),
    [fieldDefinitions],
  );
  const table = useTable({
    features: takeChargeTableFeatures,
    columns,
    data: result?.items ?? [],
    getRowId: getTakeChargeRowId,
    manualPagination: true,
    rowCount: totalCount,
    onSortingChange: (updater) => {
      setSorting((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
      setPaginationState((current) =>
        current.status === "READY"
          ? {
              status: "READY",
              pagination: resetTakeChargePageIndex(current.pagination),
            }
          : current,
      );
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    state: {
      sorting,
      columnVisibility: effectiveColumnVisibility,
      pagination,
    },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  const openDetail = (record: NormalizedTakeChargeRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };
  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    record: NormalizedTakeChargeRecord,
  ) => {
    if (
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      openDetail(record);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "OPEN_ONLY" ? "secondary" : "outline"}
            aria-pressed={viewMode === "OPEN_ONLY"}
            onClick={() => {
              setPaginationState((current) =>
                current.status === "READY"
                  ? {
                      status: "READY",
                      pagination: resetTakeChargePageIndex(current.pagination),
                    }
                  : current,
              );
              setViewMode("OPEN_ONLY");
            }}
          >
            当前未关闭
          </Button>
          <Button
            variant={viewMode === "ALL" ? "secondary" : "outline"}
            aria-pressed={viewMode === "ALL"}
            onClick={() => {
              setPaginationState((current) =>
                current.status === "READY"
                  ? {
                      status: "READY",
                      pagination: resetTakeChargePageIndex(current.pagination),
                    }
                  : current,
              );
              setViewMode("ALL");
            }}
          >
            全部
          </Button>
          <span className="text-sm text-muted-foreground">
            时间范围：提交时间
          </span>
        </div>
        <DataTableColumnVisibility table={table} labels={labels} />
      </div>

      {result && !["AVAILABLE", "CONFIRMED_EMPTY"].includes(result.availability) ? (
        <DataAvailabilityDisplay availability={result.availability} />
      ) : null}

      <div ref={tableFrameRef} className={dataTableFrameClassName}>
        <Table className={dataTableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      takeChargeColumnSizeClassName(header.column.id),
                      header.column.id === "store" && stickyStoreHeaderClassName,
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
                className="pointer-events-none invisible hover:bg-transparent"
              >
                <TableCell colSpan={visibleColumnCount}>
                  <div className="h-8" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  ref={rowIndex === 0 ? rowMeasurementRef : undefined}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看 Take Charge ${row.original.tchId}`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => openDetail(row.original)}
                  onKeyDown={(event) => handleRowKeyDown(event, row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        takeChargeColumnSizeClassName(cell.column.id),
                        cell.column.id === "store" && stickyStoreCellClassName,
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
                  当前筛选范围内没有 Take Charge 记录。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div
        ref={paginationRef}
        aria-hidden={!isPaginationReady}
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          !isPaginationReady && "invisible",
        )}
      >
        <p className="text-sm text-muted-foreground">共 {totalCount} 条记录</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            第 {pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)} 页
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

      <TakeChargeDetailSheet
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
