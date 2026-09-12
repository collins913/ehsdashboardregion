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
  dataTableClassName,
  dataTableFrameClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
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
  EventsViewMode,
  NormalizedEventRecord,
} from "@/data/contracts/events";
import type { DataAvailability } from "@/data/contracts/kpi";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  clampTablePageIndex,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { cn } from "@/lib/utils";
import type { EventType } from "@/types/ehs";

const eventsTableFeatures = defineTableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

type EventsTableFeatures = typeof eventsTableFeatures;
const columnHelper =
  createColumnHelper<EventsTableFeatures, NormalizedEventRecord>();

const columnLabels: Record<string, string> = {
  store: "门店",
  eventId: "事件编号",
  eventType: "事件类型",
  description: "事件描述",
  eventDate: "事件日期",
  status: "状态",
  submittedBy: "提交人",
};

const columnSizingClassNames: Record<string, string> = {
  eventId: "w-28 min-w-28 max-w-28",
  eventType: "w-36 min-w-36 max-w-36",
  description: "w-[20%] min-w-32",
  eventDate: "w-28 min-w-28",
  status: "w-24 min-w-24",
  submittedBy: "w-28 min-w-28",
};

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

export const DEFAULT_EVENTS_VIEW_MODE: EventsViewMode = "OPEN_ONLY";

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
            <dt className="text-xs text-muted-foreground">事件日期</dt>
            <dd className="mt-1">{record.eventDate}</dd>
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
  rows: readonly NormalizedEventRecord[];
  availability: DataAvailability;
  viewMode: EventsViewMode;
  onViewModeChange: (viewMode: EventsViewMode) => void;
  eventType: EventType | null;
  eventTypeOptions: readonly EventType[];
  onEventTypeChange: (eventType: EventType | null) => void;
};

export function EventsDataTable({
  rows,
  availability,
  viewMode,
  onViewModeChange,
  eventType,
  eventTypeOptions,
  onEventTypeChange,
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
              className="w-44 font-medium"
            />
          ),
          enableHiding: false,
          sortFn: "text",
        }),
        columnHelper.accessor("eventId", {
          id: "eventId",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.eventId} />
          ),
          cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
          sortFn: "text",
        }),
        columnHelper.accessor("eventType", {
          id: "eventType",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.eventType} />
          ),
          sortFn: "text",
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
            <span className="block w-full min-w-0 max-w-72 truncate">
              {getValue()}
            </span>
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("eventDate", {
          id: "eventDate",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.eventDate} />
          ),
          sortFn: "text",
        }),
        columnHelper.accessor("sourceStatus", {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={columnLabels.status} />
          ),
          cell: ({ row }) => <StatusDisplay status={row.original.recordState} />,
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
      ]),
    [],
  );
  const table = useTable({
    features: eventsTableFeatures,
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
            全部事件
          </Button>
          <span className="text-sm text-muted-foreground">
            时间范围：事件日期
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
                  aria-label={`查看事件 ${row.original.eventId}`}
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
        aria-hidden={!isPaginationReady}
        className={`flex flex-wrap items-center justify-between gap-3${
          isPaginationReady ? "" : " invisible"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          共 {rows.length} 条事件
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

      <EventDetailSheet
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
