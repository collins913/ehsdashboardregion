"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
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
  sortFn_basic,
  sortFn_text,
  tableFeatures as defineTableFeatures,
  useTable,
} from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  DataTableLoadingCellContent,
  DataTablePendingValue,
  useResolvedDataTableSnapshot,
  useRetainedDataTableRows,
} from "@/components/shared/data-table-loading";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import {
  availabilityLabels,
  DataAvailabilityDisplay,
} from "@/components/shared/data-availability-display";
import {
  dataTableColumnContentClassNames,
  dataTableColumnSizeClassNames,
  dataTableClassName,
  dataTableFrameClassName,
  dataTableRowClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
  type DataTableColumnSizeRole,
} from "@/components/shared/data-table-layout";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import {
  getStatusIntent,
  getStatusLabel,
  StatusDisplay,
} from "@/components/shared/status-display";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import type {
  DataAvailability,
  EhsFilterContext,
} from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import { ActionDetailContent } from "@/features/actions/action-detail-content";
import {
  KpiDetailSheet,
  type KpiDetailQueries,
  type KpiDetailSelection,
} from "@/features/kpi/kpi-detail-sheet";
import {
  buildKpiActionDrilldownQuery,
  type KpiActionDrilldownQuery,
} from "@/features/kpi/kpi-action-drilldown";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  clampTablePageIndex,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import { formatActionClosureRate } from "@/lib/format-action-closure-rate";
import { formatBusinessPeriod } from "@/lib/format-business-period";
import type {
  OccurrenceResult,
  PerformanceResult,
} from "@/lib/rules/result-types";
import { cn } from "@/lib/utils";

const kpiTableFeatures = defineTableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    basic: sortFn_basic,
    text: sortFn_text,
  },
});

type KpiTableFeatures = typeof kpiTableFeatures;

const columnHelper = createColumnHelper<KpiTableFeatures, KpiRow>();

const columnLabels: Record<string, string> = {
  store: "门店",
  training: "培训",
  drill: "演练",
  actions: "行动项",
  inspections: "检查",
  astmEvents: "ASTM 事件",
};

export const KPI_COLUMN_SIZE_ROLES = {
  store: "primary",
  training: "compact",
  drill: "compact",
  actions: "compact",
  inspections: "compact",
  astmEvents: "compact",
} satisfies Record<string, DataTableColumnSizeRole>;

function kpiColumnSizeClassName(columnId: string) {
  const role = KPI_COLUMN_SIZE_ROLES[
    columnId as keyof typeof KPI_COLUMN_SIZE_ROLES
  ];

  return role ? dataTableColumnSizeClassNames[role] : undefined;
}

function ResultCell({
  value,
  label,
  onOpen,
}: {
  value: PerformanceKpiValue;
  label: string;
  onOpen: () => void;
}) {
  return (
    <TableCellTrigger onClick={onOpen} aria-label={label}>
      {value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE" ? (
        <DataAvailabilityDisplay availability={value.availability} />
      ) : (
        <StatusDisplay status={value.result} interactive />
      )}
    </TableCellTrigger>
  );
}

function AstmResultCell({
  value,
  label,
  onOpen,
}: {
  value: AstmKpiValue;
  label: string;
  onOpen: () => void;
}) {
  if (value.result === null && value.availability !== "INCOMPLETE" && value.availability !== "UNAVAILABLE") {
    return null;
  }
  return (
    <TableCellTrigger onClick={onOpen} aria-label={label}>
      {value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE" ? (
        <DataAvailabilityDisplay availability={value.availability} />
      ) : value.result ? (
        <StatusDisplay status={value.result} interactive />
      ) : null}
    </TableCellTrigger>
  );
}

function statusSortValue(
  availability: DataAvailability,
  result: PerformanceResult | OccurrenceResult | null,
): string {
  if (availability === "INCOMPLETE" || availability === "UNAVAILABLE") {
    return availabilityLabels[availability];
  }

  return result ? getStatusLabel(result) : "";
}

function rowHasNegativeResult(row: KpiRow): boolean {
  const statuses = [
    row.training.result,
    row.drill.result,
    row.actions.result,
    row.inspections.result,
    row.astmEvents.result,
  ].filter((status): status is PerformanceResult | OccurrenceResult => status !== null);

  return statuses.some((status) => getStatusIntent(status) === "NEGATIVE");
}

function StoreNameCell({ name }: { name: string }) {
  return (
    <OverflowTooltip
      text={name}
      className={cn(
        dataTableColumnContentClassNames.primary,
        "font-medium",
      )}
    />
  );
}

export function ActionsCell({
  value,
  onOpen,
}: {
  value: ActionKpiValue;
  onOpen: () => void;
}) {
  if (value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE") {
    return <DataAvailabilityDisplay availability={value.availability} />;
  }

  return (
    <TableCellTrigger
      onClick={onOpen}
      aria-label={`查看未关闭行动项，关闭率 ${formatActionClosureRate(value.value)}`}
    >
      <StatusDisplay
        status={value.result}
        label={formatActionClosureRate(value.value)}
        showIcon={false}
        interactive
      />
    </TableCellTrigger>
  );
}

function ActionsSheet({
  row,
  open,
  onOpenChange,
  context,
  referenceDateIso,
  queryActions,
}: {
  row: KpiRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: EhsFilterContext;
  referenceDateIso: string;
  queryActions: KpiActionDrilldownQuery;
}) {
  const queryInput =
    open && row
      ? {
          referenceDateIso,
          query: buildKpiActionDrilldownQuery(context, row.store.storeId),
        }
      : null;
  const queryKey = queryInput === null ? null : JSON.stringify(queryInput);
  const load = useCallback(
    () => queryActions(queryInput!),
    [queryActions, queryKey],
  );
  const queryState = useLatestAsyncQuery(
    queryKey,
    queryInput === null ? null : load,
  );
  const actions = queryState.status === "SUCCESS" ? queryState.data : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>行动项</SheetTitle>
          <SheetDescription>{row?.store.displayName ?? ""}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 pb-4">
          {row ? (
            <dl className="space-y-4 px-4">
              <div>
                <dt className="text-xs text-muted-foreground">统计周期</dt>
                <dd className="mt-1">{formatBusinessPeriod(context.period)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">当前结果</dt>
                <dd className="mt-1">
                  {row.actions.availability === "INCOMPLETE" || row.actions.availability === "UNAVAILABLE" ? (
                    <DataAvailabilityDisplay availability={row.actions.availability} />
                  ) : (
                    <StatusDisplay status={row.actions.result} />
                  )}
                </dd>
              </div>
            </dl>
          ) : null}
          {queryState.status === "LOADING" ? (
            <AsyncQueryFeedback status="LOADING" />
          ) : queryState.status === "ERROR" ? (
            <AsyncQueryFeedback status="ERROR" />
          ) : !actions || actions.availability === "UNAVAILABLE" ? (
            <p className="text-sm text-muted-foreground">行动项明细不可用。</p>
          ) : actions.availability === "INCOMPLETE" ? (
            <div className="space-y-3">
              <DataAvailabilityDisplay availability="INCOMPLETE" />
              <p className="text-sm text-muted-foreground">
                当前记录可能未覆盖完整范围。
              </p>
            </div>
          ) : actions.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">没有未关闭行动项。</p>
          ) : (
            <div className="space-y-6">
              {actions.items.map((action, index) => (
                <div key={action.actionId}>
                  {index > 0 ? <Separator className="mb-6" /> : null}
                  <ActionDetailContent record={action} />
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type KpiDataTableProps = {
  rows: readonly KpiRow[];
  context: EhsFilterContext;
  referenceDateIso: string;
  queryActions: KpiActionDrilldownQuery;
  queryKpiDetails: KpiDetailQueries;
  queryStatus?: "READY" | "LOADING" | "ERROR";
};

type KpiPaginationState =
  | { status: "UNMEASURED" }
  | { status: "READY"; pagination: AdaptivePagination };

const unmeasuredTablePagination: PaginationState = {
  pageIndex: 0,
  pageSize: 1,
};

export function KpiDataTable({
  rows,
  context,
  referenceDateIso,
  queryActions,
  queryKpiDetails,
  queryStatus = "READY",
}: KpiDataTableProps) {
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [selectedRow, setSelectedRow] = useState<KpiRow | null>(null);
  const [isActionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<KpiDetailSelection | null>(null);
  const [isDetailSheetOpen, setDetailSheetOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [paginationState, setPaginationState] =
    useState<KpiPaginationState>({ status: "UNMEASURED" });
  const isQueryLoading = queryStatus === "LOADING";
  const semanticKey = JSON.stringify([context, referenceDateIso]);
  const { snapshot, isResolvedMetadataPending } = useResolvedDataTableSnapshot({
    snapshot: queryStatus === "READY" ? rows : null,
    status: queryStatus,
    metadataKey: semanticKey,
  });
  const resolvedRows = snapshot ?? [];
  const data = useMemo(
    () =>
      abnormalOnly
        ? resolvedRows.filter(rowHasNegativeResult)
        : resolvedRows,
    [abnormalOnly, resolvedRows],
  );
  useLayoutEffect(() => {
    if (isQueryLoading) {
      setSelectedRow(null);
      setActionsSheetOpen(false);
    }
  }, [isQueryLoading]);
  useLayoutEffect(() => {
    if (
      !isDetailSheetOpen ||
      selectedDetail === null ||
      selectedDetail.scopeKey === semanticKey
    ) {
      return;
    }

    if (queryStatus === "ERROR") {
      setSelectedDetail(null);
      setDetailSheetOpen(false);
      return;
    }
    if (queryStatus !== "READY") return;

    const updatedRow = rows.find(
      (row) => row.store.storeId === selectedDetail.row.store.storeId,
    );
    if (!updatedRow) {
      setSelectedDetail(null);
      setDetailSheetOpen(false);
      return;
    }
    setSelectedDetail({
      ...selectedDetail,
      row: updatedRow,
      scopeKey: semanticKey,
    });
  }, [isDetailSheetOpen, queryStatus, rows, selectedDetail, semanticKey]);
  const isPaginationReady = paginationState.status === "READY";
  const pagination = useMemo<PaginationState>(() => {
    if (paginationState.status === "UNMEASURED") {
      return unmeasuredTablePagination;
    }

    return {
      pageIndex: clampTablePageIndex(
        paginationState.pagination.pageIndex,
        data.length,
        paginationState.pagination.pageSize,
      ),
      pageSize: paginationState.pagination.pageSize,
    };
  }, [data.length, paginationState]);
  const handleAdaptivePageSizeChange = useCallback(
    (pageSize: AdaptiveTablePageSize) => {
      setPaginationState((current) => {
        const currentPagination =
          current.status === "READY"
            ? current.pagination
            : { pageIndex: 0, pageSize };
        const nextPagination = paginationForPageSize(
          currentPagination,
          data.length,
          pageSize,
        );

        if (
          current.status === "READY" &&
          current.pagination.pageIndex === nextPagination.pageIndex &&
          current.pagination.pageSize === nextPagination.pageSize
        ) {
          return current;
        }

        return { status: "READY", pagination: nextPagination };
      });
    },
    [data.length],
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
            data.length,
            current.pagination.pageSize,
          ),
          pageSize: current.pagination.pageSize,
        };
        const proposedPagination =
          typeof updater === "function" ? updater(currentPagination) : updater;
        const nextPagination: AdaptivePagination = {
          pageIndex: clampTablePageIndex(
            proposedPagination.pageIndex,
            data.length,
            current.pagination.pageSize,
          ),
          pageSize: current.pagination.pageSize,
        };

        if (
          current.pagination.pageIndex === nextPagination.pageIndex &&
          current.pagination.pageSize === nextPagination.pageSize
        ) {
          return current;
        }

        return { status: "READY", pagination: nextPagination };
      });
    },
    [data.length],
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
        data.length,
        current.pagination.pageSize,
      );

      if (pageIndex === current.pagination.pageIndex) {
        return current;
      }

      return {
        status: "READY",
        pagination: { ...current.pagination, pageIndex },
      };
    });
  }, [data.length]);
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.store.displayName, {
          id: "store",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.store} />
          ),
          cell: ({ row }) => (
            <StoreNameCell name={row.original.store.displayName} />
          ),
          enableHiding: false,
          sortFn: "text",
        }),
        columnHelper.accessor(
          (row) => statusSortValue(row.training.availability, row.training.result),
          {
            id: "training",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title={columnLabels.training} />
            ),
            cell: ({ row }) => (
              <ResultCell
                value={row.original.training}
                label={`查看培训明细，${row.original.store.displayName}`}
                onOpen={() => {
                  setSelectedDetail({ category: "training", row: row.original, scopeKey: semanticKey });
                  setDetailSheetOpen(true);
                }}
              />
            ),
            sortFn: "text",
          },
        ),
        columnHelper.accessor(
          (row) => statusSortValue(row.drill.availability, row.drill.result),
          {
            id: "drill",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title={columnLabels.drill} />
            ),
            cell: ({ row }) => (
              <ResultCell
                value={row.original.drill}
                label={`查看演练明细，${row.original.store.displayName}`}
                onOpen={() => {
                  setSelectedDetail({ category: "drill", row: row.original, scopeKey: semanticKey });
                  setDetailSheetOpen(true);
                }}
              />
            ),
            sortFn: "text",
          },
        ),
        columnHelper.accessor((row) => row.actions.value ?? undefined, {
          id: "actions",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.actions} />
          ),
          cell: ({ row }) => (
            <ActionsCell
              value={row.original.actions}
              onOpen={() => {
                setSelectedRow(row.original);
                setActionsSheetOpen(true);
              }}
            />
          ),
          sortFn: "basic",
          sortUndefined: "last",
        }),
        columnHelper.accessor(
          (row) =>
            statusSortValue(row.inspections.availability, row.inspections.result),
          {
            id: "inspections",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title={columnLabels.inspections} />
            ),
            cell: ({ row }) => (
              <ResultCell
                value={row.original.inspections}
                label={`查看检查明细，${row.original.store.displayName}`}
                onOpen={() => {
                  setSelectedDetail({ category: "inspections", row: row.original, scopeKey: semanticKey });
                  setDetailSheetOpen(true);
                }}
              />
            ),
            sortFn: "text",
          },
        ),
        columnHelper.accessor(
          (row) => statusSortValue(row.astmEvents.availability, row.astmEvents.result),
          {
            id: "astmEvents",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title={columnLabels.astmEvents} />
            ),
            cell: ({ row }) => (
              <AstmResultCell
                value={row.original.astmEvents}
                label={`查看 ASTM 事件明细，${row.original.store.displayName}`}
                onOpen={() => {
                  setSelectedDetail({ category: "astmEvents", row: row.original, scopeKey: semanticKey });
                  setDetailSheetOpen(true);
                }}
              />
            ),
            sortFn: "text",
          },
        ),
      ]),
    [],
  );
  const table = useTable({
    features: kpiTableFeatures,
    columns,
    data,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const displayedRows = table.getRowModel().rows;
  const {
    rows: renderedRows,
    isRetainingResolvedRows,
  } = useRetainedDataTableRows({
    rows: displayedRows,
    status: queryStatus,
  });
  const placeholderColumns = table.getVisibleLeafColumns().map((column) => ({
    id: column.id,
    className: cn(
      kpiColumnSizeClassName(column.id),
      column.id === "store" && stickyStoreCellClassName,
    ),
  }));

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center justify-between gap-2"
        inert={isQueryLoading ? true : undefined}
      >
        <FilterSelect
          ariaLabel="KPI 结果筛选"
          value={abnormalOnly ? "ABNORMAL_ONLY" : "ALL"}
          options={[
            { value: "ALL", label: "全部" },
            { value: "ABNORMAL_ONLY", label: "异常" },
          ]}
          disabled={isQueryLoading}
          onValueChange={(value) => {
            table.firstPage();
            setAbnormalOnly(value === "ABNORMAL_ONLY");
          }}
        />
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
                      kpiColumnSizeClassName(header.column.id),
                      header.column.id === "store" &&
                        stickyStoreHeaderClassName,
                    )}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
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
                  aria-hidden={isRetainingResolvedRows || undefined}
                  className={cn(
                    !isRetainingResolvedRows && dataTableRowClassName,
                    isRetainingResolvedRows && "hover:bg-transparent",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        kpiColumnSizeClassName(cell.column.id),
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
                  {abnormalOnly ? "没有异常 KPI 记录。" : "没有 KPI 记录。"}
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
          共 <DataTablePendingValue pending={isResolvedMetadataPending}>{data.length}</DataTablePendingValue> 家门店
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            第 <DataTablePendingValue pending={isResolvedMetadataPending}>{table.state.pagination.pageIndex + 1}</DataTablePendingValue> / <DataTablePendingValue pending={isResolvedMetadataPending}>{Math.max(table.getPageCount(), 1)}</DataTablePendingValue> 页
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

      <ActionsSheet
        row={selectedRow}
        open={isActionsSheetOpen}
        onOpenChange={setActionsSheetOpen}
        context={context}
        referenceDateIso={referenceDateIso}
        queryActions={queryActions}
      />
      <KpiDetailSheet
        selection={selectedDetail}
        open={isDetailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        context={context}
        referenceDateIso={referenceDateIso}
        queries={queryKpiDetails}
        summaryPending={
          selectedDetail !== null &&
          selectedDetail.scopeKey !== semanticKey &&
          queryStatus === "LOADING"
        }
      />
    </div>
  );
}
