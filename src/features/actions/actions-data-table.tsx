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
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  DataTableLoadingCellContent,
  DataTablePendingFeedback,
  DataTablePendingValue,
  useResolvedDataTableSnapshot,
  useRetainedDataTableRows,
} from "@/components/shared/data-table-loading";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
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
import type {
  ActionSortKey,
  ActionsQuery,
  ActionsQueryResult,
  ActionsViewMode,
  NormalizedActionRecord,
} from "@/data/contracts/actions";
import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import { cn } from "@/lib/utils";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

const actionsTableFeatures = defineTableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
});

type ActionsTableFeatures = typeof actionsTableFeatures;

const columnHelper =
  createColumnHelper<ActionsTableFeatures, NormalizedActionRecord>();

const columnLabels: Record<string, string> = {
  store: "门店",
  actionId: "行动项编号",
  problem: "问题",
  action: "行动项",
  dueDate: "截止时间",
  status: "状态",
  owner: "负责人",
  submittedBy: "提交人",
  submittedDate: "提交时间",
  closedDate: "关闭时间",
};

export const ACTION_COLUMN_SIZE_ROLES = {
  store: "primary",
  actionId: "compact",
  problem: "content",
  action: "content",
  dueDate: "compact",
  status: "compact",
  owner: "standard",
  submittedBy: "standard",
  submittedDate: "compact",
  closedDate: "compact",
} satisfies Record<string, DataTableColumnSizeRole>;

function actionColumnSizeClassName(columnId: string) {
  const role = ACTION_COLUMN_SIZE_ROLES[
    columnId as keyof typeof ACTION_COLUMN_SIZE_ROLES
  ];

  return role ? dataTableColumnSizeClassNames[role] : undefined;
}

export const DEFAULT_ACTION_COLUMN_VISIBILITY: ColumnVisibilityState = {
  owner: false,
  submittedBy: false,
  submittedDate: false,
  closedDate: false,
};

export const DEFAULT_VISIBLE_ACTION_COLUMN_IDS = [
  "store",
  "actionId",
  "problem",
  "action",
  "dueDate",
  "status",
] as const;

export const DEFAULT_ACTIONS_VIEW_MODE: ActionsViewMode = "ALL";

export function getActionRowId(record: NormalizedActionRecord): string {
  return record.actionId;
}

type ActionsPaginationState =
  | { status: "UNMEASURED" }
  | { status: "READY"; pagination: AdaptivePagination };

const unmeasuredTablePagination: PaginationState = {
  pageIndex: 0,
  pageSize: 1,
};

export function ActionDetailContent({
  record,
}: {
  record: NormalizedActionRecord;
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
            <dt className="text-xs text-muted-foreground">行动项编号</dt>
            <dd className="mt-1">{record.actionId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">状态</dt>
            <dd className="mt-1">
              <ActionStatusDisplay status={record.sourceStatus} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">问题</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {record.problem}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">行动项</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {record.action}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">人员与时间</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">负责人</dt>
            <dd className="mt-1">{record.owner}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">提交人</dt>
            <dd className="mt-1">{record.submittedBy}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">提交时间</dt>
            <dd className="mt-1">
              {formatBusinessDateTime(record.submittedDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">截止时间</dt>
            <dd className="mt-1">{formatBusinessDateTime(record.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">关闭时间</dt>
            <dd className="mt-1">
              {formatBusinessDateTime(record.closedDate)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ActionDetailSheet({
  record,
  open,
  onOpenChange,
}: {
  record: NormalizedActionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>行动项详情</SheetTitle>
          <SheetDescription>
            {record ? `${record.storeDisplayName} · ${record.actionId}` : ""}
          </SheetDescription>
        </SheetHeader>
        {record ? <ActionDetailContent record={record} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DataAvailabilityNotice({
  availability,
}: {
  availability: DataAvailability;
}) {
  if (availability === "AVAILABLE" || availability === "CONFIRMED_EMPTY") {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
      {availability === "INCOMPLETE"
        ? "行动项数据不完整，当前结果可能缺少记录。"
        : "行动项数据不可用。"}
    </div>
  );
}

type ActionsDataTableProps = {
  context: EhsFilterContext;
  referenceDateIso: string;
  viewMode: ActionsViewMode;
  onViewModeChange: (viewMode: ActionsViewMode) => void;
  queryActions: (input: {
    referenceDateIso: string;
    query: ActionsQuery;
  }) => Promise<ActionsQueryResult>;
};

export function ActionsDataTable({
  context,
  referenceDateIso,
  viewMode,
  onViewModeChange,
  queryActions,
}: ActionsDataTableProps) {
  const [selectedRecord, setSelectedRecord] =
    useState<NormalizedActionRecord | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(DEFAULT_ACTION_COLUMN_VISIBILITY);
  const [paginationState, setPaginationState] =
    useState<ActionsPaginationState>({ status: "UNMEASURED" });
  const isPaginationReady = paginationState.status === "READY";
  const pagination =
    paginationState.status === "READY"
      ? paginationState.pagination
      : unmeasuredTablePagination;
  const sortingDescriptor =
    sorting.length === 0
      ? undefined
      : {
          key: sorting[0].id as ActionSortKey,
          direction: sorting[0].desc ? ("desc" as const) : ("asc" as const),
        };
  const queryInput =
    paginationState.status === "READY"
      ? {
          referenceDateIso,
          query: {
            context,
            viewMode,
            sorting: sortingDescriptor,
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          },
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
  const currentResult: ActionsQueryResult | null =
    queryState.status === "SUCCESS" ? queryState.data : null;
  const metadataKey = JSON.stringify([referenceDateIso, context, viewMode]);
  const {
    snapshot: result,
    isResolvedMetadataPending,
    pendingMode,
  } = useResolvedDataTableSnapshot({
    snapshot: currentResult ? { ...currentResult, resolvedSorting: sorting } : null,
    status:
      queryState.status === "SUCCESS"
        ? "READY"
        : queryState.status === "ERROR"
          ? "ERROR"
          : "LOADING",
    metadataKey,
  });
  const rows = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const availability: DataAvailability =
    queryState.status === "ERROR"
      ? "UNAVAILABLE"
      : currentResult?.availability ?? "AVAILABLE";
  const isQueryLoading = queryState.status === "LOADING";
  const queryScopeKey = JSON.stringify([referenceDateIso, context]);
  const handleAdaptivePageSizeChange = useCallback(
    (pageSize: AdaptiveTablePageSize) => {
      setPaginationState((current) => {
        const currentPagination =
          current.status === "READY"
            ? current.pagination
            : { pageIndex: 0, pageSize };
        const nextPagination = paginationForPageSize(
          currentPagination,
          totalCount,
          pageSize,
        );

        return current.status === "READY" &&
          current.pagination.pageIndex === nextPagination.pageIndex &&
          current.pagination.pageSize === nextPagination.pageSize
          ? current
          : { status: "READY", pagination: nextPagination };
      });
    },
    [totalCount],
  );
  const handlePaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      setPaginationState((current) => {
        if (current.status === "UNMEASURED") {
          return current;
        }

        const currentPagination: PaginationState = current.pagination;
        const proposedPagination =
          typeof updater === "function" ? updater(currentPagination) : updater;
        const nextPagination: AdaptivePagination = {
          pageIndex: Math.max(0, proposedPagination.pageIndex),
          pageSize: current.pagination.pageSize,
        };

        return current.pagination.pageIndex === nextPagination.pageIndex
          ? current
          : { status: "READY", pagination: nextPagination };
      });
    },
    [],
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
    setSelectedRecord(null);
    setDetailOpen(false);
    setPaginationState((current) =>
      current.status === "READY" && current.pagination.pageIndex !== 0
        ? {
            status: "READY",
            pagination: { ...current.pagination, pageIndex: 0 },
          }
        : current,
    );
  }, [queryScopeKey]);

  useLayoutEffect(() => {
    if (
      currentResult !== null &&
      paginationState.status === "READY" &&
      currentResult.pageIndex !== paginationState.pagination.pageIndex
    ) {
      setPaginationState({
        status: "READY",
        pagination: {
          ...paginationState.pagination,
          pageIndex: currentResult.pageIndex,
        },
      });
    }
  }, [currentResult, paginationState]);

  const openDetail = useCallback((record: NormalizedActionRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  }, []);
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => row.storeDisplayName, {
          id: "store",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.store} />
          ),
          cell: ({ row }) => (
            <OverflowTooltip
              text={row.original.storeDisplayName}
              className={cn(
                dataTableColumnContentClassNames.primary,
                "font-medium",
              )}
            />
          ),
          enableHiding: false,
        }),
        columnHelper.accessor("actionId", {
          id: "actionId",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.actionId} />
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
        columnHelper.accessor("problem", {
          id: "problem",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.problem} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={dataTableColumnContentClassNames.content}
              focusable={false}
            />
          ),
        }),
        columnHelper.accessor("action", {
          id: "action",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.action} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={dataTableColumnContentClassNames.content}
              focusable={false}
            />
          ),
        }),
        columnHelper.accessor((row) => formatBusinessDate(row.dueDate), {
          id: "dueDate",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.dueDate} />
          ),
        }),
        columnHelper.accessor((row) => row.sourceStatus.value, {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.status} />
          ),
          cell: ({ row }) => (
            <ActionStatusDisplay status={row.original.sourceStatus} />
          ),
        }),
        columnHelper.accessor("owner", {
          id: "owner",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.owner} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
        }),
        columnHelper.accessor("submittedBy", {
          id: "submittedBy",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={columnLabels.submittedBy}
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
        columnHelper.accessor((row) => formatBusinessDate(row.submittedDate), {
          id: "submittedDate",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={columnLabels.submittedDate}
            />
          ),
        }),
        columnHelper.accessor(
          (row) =>
            row.closedDate === null ? "—" : formatBusinessDate(row.closedDate),
          {
            id: "closedDate",
            header: ({ column }) => (
              <DataTableColumnHeader
                column={column}
                title={columnLabels.closedDate}
              />
            ),
          },
        ),
      ]),
    [],
  );
  const table = useTable({
    features: actionsTableFeatures,
    columns,
    data: rows,
    getRowId: getActionRowId,
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    onSortingChange: (updater) => {
      setSorting((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
      setPaginationState((current) =>
        current.status === "READY"
          ? {
              status: "READY",
              pagination: { ...current.pagination, pageIndex: 0 },
            }
          : current,
      );
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    state: { sorting: result?.resolvedSorting ?? sorting, columnVisibility, pagination },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const displayedRows = table.getRowModel().rows;
  const {
    rows: renderedRows,
    isRetainingResolvedRows,
  } = useRetainedDataTableRows({
    rows: displayedRows,
    status:
      queryState.status === "SUCCESS"
        ? "READY"
        : queryState.status === "ERROR"
          ? "ERROR"
          : "LOADING",
  });
  const placeholderColumns = table.getVisibleLeafColumns().map((column) => ({
    id: column.id,
    className: cn(
      actionColumnSizeClassName(column.id),
      column.id === "store" && stickyStoreCellClassName,
    ),
  }));
  const resolvedPageIndex = result?.pageIndex ?? pagination.pageIndex;
  const resolvedPageSize = result?.pageSize ?? pagination.pageSize;
  const resolvedPageCount = Math.max(
    Math.ceil(totalCount / resolvedPageSize),
    1,
  );

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    record: NormalizedActionRecord,
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
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        inert={isQueryLoading ? true : undefined}
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            ariaLabel="行动项范围筛选"
            value={viewMode}
            options={[
              { value: "ALL", label: "全部" },
              { value: "OPEN_ONLY", label: "未关闭" },
            ]}
            disabled={isQueryLoading}
            onValueChange={(nextViewMode) => {
              table.firstPage();
              onViewModeChange(nextViewMode);
            }}
          />
          <span className="text-sm text-muted-foreground">
            时间范围：提交时间
          </span>
        </div>
        <DataTableColumnVisibility table={table} labels={columnLabels} />
      </div>

      <DataAvailabilityNotice availability={availability} />

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
                      actionColumnSizeClassName(header.column.id),
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
            ) : queryState.status === "ERROR" ||
              (queryState.status === "LOADING" &&
                !isRetainingResolvedRows) ? (
              <DataTablePlaceholderRows
                columns={placeholderColumns}
                rowCount={pagination.pageSize}
                hidden={queryState.status === "ERROR"}
              />
            ) : renderedRows.length > 0 ? (
              renderedRows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  ref={rowIndex === 0 ? rowMeasurementRef : undefined}
                  role="button"
                  tabIndex={isRetainingResolvedRows ? -1 : 0}
                  aria-hidden={
                    (isRetainingResolvedRows && pendingMode === "mask-content") || undefined
                  }
                  aria-label={`查看行动项 ${row.original.actionId}`}
                  className={cn(
                    !isRetainingResolvedRows && dataTableRowClassName,
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
                        actionColumnSizeClassName(cell.column.id),
                        cell.column.id === "store" &&
                          stickyStoreCellClassName,
                      )}
                    >
                      <DataTableLoadingCellContent
                        loading={isRetainingResolvedRows}
                        pendingMode={pendingMode}
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
                  {viewMode === "OPEN_ONLY"
                    ? "当前筛选范围内没有未关闭行动项。"
                    : "当前筛选范围内没有行动项。"}
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
            {totalCount}
          </DataTablePendingValue>{" "}
          条行动项
        </p>
        <div className="flex items-center gap-2">
          <DataTablePendingFeedback isPending={isQueryLoading && pendingMode === "preserve-visible"} />
          <span className="text-sm text-muted-foreground">
            第{" "}
            <DataTablePendingValue pending={isResolvedMetadataPending}>
              {resolvedPageIndex + 1}
            </DataTablePendingValue>{" "}
            /{" "}
            <DataTablePendingValue pending={isResolvedMetadataPending}>
              {resolvedPageCount}
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

      <ActionDetailSheet
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
