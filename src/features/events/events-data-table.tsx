"use client";

import {
  useCallback,
  useEffect,
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
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import { FilterButtonGroup } from "@/components/shared/filter-button-group";
import {
  DataTableLoadingCellContent,
  DataTablePendingFeedback,
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
import { StatusDisplay } from "@/components/shared/status-display";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  EventsQueryResult,
  EventsQuery,
  EventSortKey,
  EventsViewMode,
  NormalizedEventRecord,
} from "@/data/contracts/events";
import type { DataAvailability, EhsFilterContext } from "@/data/contracts/kpi";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import { cn } from "@/lib/utils";
import type { EventType } from "@/types/ehs";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

const eventsTableFeatures = defineTableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
});

type EventsTableFeatures = typeof eventsTableFeatures;
const columnHelper =
  createColumnHelper<EventsTableFeatures, NormalizedEventRecord>();

const columnLabels: Record<string, string> = {
  store: "门店",
  eventId: "事件编号",
  eventType: "事件类型",
  description: "事件描述",
  eventDate: "事件时间",
  status: "状态",
  submittedBy: "提交人",
};

export const EVENT_COLUMN_SIZE_ROLES = {
  store: "primary",
  eventId: "compact",
  eventType: "standard",
  description: "content",
  eventDate: "compact",
  status: "compact",
  submittedBy: "standard",
} satisfies Record<string, DataTableColumnSizeRole>;

function eventColumnSizeClassName(columnId: string) {
  const role = EVENT_COLUMN_SIZE_ROLES[
    columnId as keyof typeof EVENT_COLUMN_SIZE_ROLES
  ];

  return role ? dataTableColumnSizeClassNames[role] : undefined;
}

export const DEFAULT_EVENT_COLUMN_VISIBILITY: ColumnVisibilityState = {
  submittedBy: false,
};

export const DEFAULT_VISIBLE_EVENT_COLUMN_IDS = [
  "store",
  "eventId",
  "eventType",
  "description",
  "eventDate",
  "status",
] as const;

export const DEFAULT_EVENTS_VIEW_MODE: EventsViewMode = "ALL";

export function getEventRowId(record: NormalizedEventRecord): string {
  return record.eventId;
}

const ALL_EVENT_TYPES = "__ALL_EVENT_TYPES__";

type EventsPaginationState =
  | { status: "UNMEASURED" }
  | { status: "READY"; pagination: AdaptivePagination };

const unmeasuredTablePagination: PaginationState = {
  pageIndex: 0,
  pageSize: 1,
};

export function EventDetailContent({
  record,
}: {
  record: NormalizedEventRecord;
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
            <dt className="text-xs text-muted-foreground">事件编号</dt>
            <dd className="mt-1">{record.eventId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">事件类型</dt>
            <dd className="mt-1">{record.eventType}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">状态</dt>
            <dd className="mt-1">
              <StatusDisplay status={record.recordState} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">事件描述</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {record.description}
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
            <dt className="text-xs text-muted-foreground">事件时间</dt>
            <dd className="mt-1">
              {formatBusinessDateTime(record.eventDate)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function EventDetailSheet({
  record,
  open,
  onOpenChange,
}: {
  record: NormalizedEventRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
        <SheetHeader>
          <SheetTitle>事件详情</SheetTitle>
          <SheetDescription>
            {record ? `${record.storeDisplayName} · ${record.eventId}` : ""}
          </SheetDescription>
        </SheetHeader>
        {record ? <EventDetailContent record={record} /> : null}
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
        ? "事件数据不完整，当前结果可能缺少记录。"
        : "事件数据不可用。"}
    </div>
  );
}

type EventsDataTableProps = {
  context: EhsFilterContext;
  referenceDateIso: string;
  viewMode: EventsViewMode;
  onViewModeChange: (viewMode: EventsViewMode) => void;
  eventType: EventType | null;
  onEventTypeChange: (eventType: EventType | null) => void;
  queryEvents: (input: {
    referenceDateIso: string;
    query: EventsQuery;
  }) => Promise<EventsQueryResult>;
};

export function EventsDataTable({
  context,
  referenceDateIso,
  viewMode,
  onViewModeChange,
  eventType,
  onEventTypeChange,
  queryEvents,
}: EventsDataTableProps) {
  const [selectedRecord, setSelectedRecord] =
    useState<NormalizedEventRecord | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(DEFAULT_EVENT_COLUMN_VISIBILITY);
  const [paginationState, setPaginationState] =
    useState<EventsPaginationState>({ status: "UNMEASURED" });
  const isPaginationReady = paginationState.status === "READY";
  const pagination =
    paginationState.status === "READY"
      ? paginationState.pagination
      : unmeasuredTablePagination;
  const sortingDescriptor =
    sorting.length === 0
      ? undefined
      : {
          key: sorting[0].id as EventSortKey,
          direction: sorting[0].desc ? ("desc" as const) : ("asc" as const),
        };
  const queryInput =
    paginationState.status === "READY"
      ? {
          referenceDateIso,
          query: {
            context,
            viewMode,
            eventType: eventType ?? undefined,
            sorting: sortingDescriptor,
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          },
        }
      : null;
  const queryKey = queryInput === null ? null : JSON.stringify(queryInput);
  const load = useCallback(
    () => queryEvents(queryInput!),
    [queryEvents, queryKey],
  );
  const queryState = useLatestAsyncQuery(
    queryKey,
    queryInput === null ? null : load,
  );
  const currentResult: EventsQueryResult | null =
    queryState.status === "SUCCESS" ? queryState.data : null;
  const metadataKey = JSON.stringify([
    referenceDateIso,
    context,
    viewMode,
    eventType,
  ]);
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
  const eventTypeOptions = currentResult?.availableEventTypes ?? [];
  const availability: DataAvailability =
    queryState.status === "ERROR"
      ? "UNAVAILABLE"
      : currentResult?.availability ?? "AVAILABLE";
  const isQueryLoading = queryState.status === "LOADING";
  const queryScopeKey = JSON.stringify([referenceDateIso, context]);

  useEffect(() => {
    if (
      currentResult !== null &&
      eventType !== null &&
      !eventTypeOptions.includes(eventType)
    ) {
      onEventTypeChange(null);
    }
  }, [currentResult, eventType, eventTypeOptions, onEventTypeChange]);
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

  const openDetail = useCallback((record: NormalizedEventRecord) => {
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
        columnHelper.accessor("eventId", {
          id: "eventId",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.eventId} />
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
        columnHelper.accessor("eventType", {
          id: "eventType",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.eventType} />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={dataTableColumnContentClassNames.standard}
              focusable={false}
            />
          ),
        }),
        columnHelper.accessor("description", {
          id: "description",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={columnLabels.description}
            />
          ),
          cell: ({ getValue }) => (
            <OverflowTooltip
              text={getValue()}
              className={dataTableColumnContentClassNames.content}
              focusable={false}
            />
          ),
        }),
        columnHelper.accessor((row) => formatBusinessDate(row.eventDate), {
          id: "eventDate",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.eventDate} />
          ),
        }),
        columnHelper.accessor("sourceStatus", {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.status} />
          ),
          cell: ({ row }) => <StatusDisplay status={row.original.recordState} />,
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
      ]),
    [],
  );
  const table = useTable({
    features: eventsTableFeatures,
    columns,
    data: rows,
    getRowId: getEventRowId,
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
      eventColumnSizeClassName(column.id),
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
    record: NormalizedEventRecord,
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
          <FilterButtonGroup
            ariaLabel="事件范围筛选"
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
            时间范围：事件时间
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={eventType ?? ALL_EVENT_TYPES}
            onValueChange={(value) => {
              table.firstPage();
              onEventTypeChange(
                value === ALL_EVENT_TYPES ? null : (value as EventType),
              );
            }}
          >
            <SelectTrigger className="w-44" aria-label="事件类型筛选">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EVENT_TYPES}>全部事件类型</SelectItem>
              {eventTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DataTableColumnVisibility table={table} labels={columnLabels} />
        </div>
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
                      eventColumnSizeClassName(header.column.id),
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
                  aria-label={`查看事件 ${row.original.eventId}`}
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
                        eventColumnSizeClassName(cell.column.id),
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
                    ? "当前筛选范围内没有未关闭事件。"
                    : "当前筛选范围内没有事件。"}
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
          条事件
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

      <EventDetailSheet
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
