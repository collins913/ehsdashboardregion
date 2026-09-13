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
  sortFn_basic,
  sortFn_text,
  tableFeatures as defineTableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  dataTableClassName,
  dataTableFrameClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
} from "@/components/shared/data-table-layout";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
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
  ActionsViewMode,
  NormalizedActionRecord,
} from "@/data/contracts/actions";
import type { DataAvailability } from "@/data/contracts/kpi";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  clampTablePageIndex,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

const actionsTableFeatures = defineTableFeatures({
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

const columnSizingClassNames: Record<string, string> = {
  actionId: "w-32 min-w-32 max-w-32",
  problem: "w-[18%] min-w-36 max-w-52",
  action: "w-[18%] min-w-36 max-w-52",
  dueDate: "w-28 min-w-28",
  status: "w-24 min-w-24",
  owner: "w-28 min-w-28",
  submittedBy: "w-28 min-w-28",
  submittedDate: "w-28 min-w-28",
  closedDate: "w-28 min-w-28",
};

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

export const DEFAULT_ACTIONS_VIEW_MODE: ActionsViewMode = "OPEN_ONLY";

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
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
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
  rows: readonly NormalizedActionRecord[];
  availability: DataAvailability;
  viewMode: ActionsViewMode;
  onViewModeChange: (viewMode: ActionsViewMode) => void;
};

export function ActionsDataTable({
  rows,
  availability,
  viewMode,
  onViewModeChange,
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
              className="w-44 font-medium"
            />
          ),
          enableHiding: false,
          sortFn: "text",
        }),
        columnHelper.accessor("actionId", {
          id: "actionId",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.actionId} />
          ),
          cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor("problem", {
          id: "problem",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.problem} />
          ),
          cell: ({ getValue }) => (
            <span className="block w-full min-w-0 max-w-52 truncate">
              {getValue()}
            </span>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("action", {
          id: "action",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.action} />
          ),
          cell: ({ getValue }) => (
            <span className="block w-full min-w-0 max-w-52 truncate">
              {getValue()}
            </span>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => formatBusinessDate(row.dueDate), {
          id: "dueDate",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.dueDate} />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => row.sourceStatus.value, {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.status} />
          ),
          cell: ({ row }) => (
            <ActionStatusDisplay status={row.original.sourceStatus} />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("owner", {
          id: "owner",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.owner} />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("submittedBy", {
          id: "submittedBy",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={columnLabels.submittedBy}
            />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor((row) => formatBusinessDate(row.submittedDate), {
          id: "submittedDate",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={columnLabels.submittedDate}
            />
          ),
          sortFn: "text",
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
            sortFn: "text",
          },
        ),
      ]),
    [],
  );
  const table = useTable({
    features: actionsTableFeatures,
    columns,
    data: rows,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    state: { sorting, columnVisibility, pagination },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const displayedRows = table.getRowModel().rows;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "OPEN_ONLY" ? "secondary" : "outline"}
            aria-pressed={viewMode === "OPEN_ONLY"}
            onClick={() => {
              table.firstPage();
              onViewModeChange("OPEN_ONLY");
            }}
          >
            当前未关闭
          </Button>
          <Button
            variant={viewMode === "ALL" ? "secondary" : "outline"}
            aria-pressed={viewMode === "ALL"}
            onClick={() => {
              table.firstPage();
              onViewModeChange("ALL");
            }}
          >
            全部行动项
          </Button>
          <span className="text-sm text-muted-foreground">
            时间范围：提交时间
          </span>
        </div>
        <DataTableColumnVisibility table={table} labels={columnLabels} />
      </div>

      <DataAvailabilityNotice availability={availability} />

      <div ref={tableFrameRef} className={dataTableFrameClassName}>
        <Table className={dataTableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      columnSizingClassNames[header.column.id],
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
                  aria-label={`查看行动项 ${row.original.actionId}`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => openDetail(row.original)}
                  onKeyDown={(event) => handleRowKeyDown(event, row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        columnSizingClassNames[cell.column.id],
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
        aria-hidden={!isPaginationReady}
        className={`flex flex-wrap items-center justify-between gap-3${
          isPaginationReady ? "" : " invisible"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          共 {rows.length} 条行动项
        </p>
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

      <ActionDetailSheet
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
