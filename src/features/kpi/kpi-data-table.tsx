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
import { ListFilter } from "lucide-react";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { DataTableColumnVisibility } from "@/components/shared/data-table-column-visibility";
import {
  availabilityLabels,
  DataAvailabilityDisplay,
} from "@/components/shared/data-availability-display";
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
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import {
  getStatusIntent,
  getStatusLabel,
  StatusDisplay,
} from "@/components/shared/status-display";
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
import type { DataAvailability } from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
import {
  type AdaptivePagination,
  type AdaptiveTablePageSize,
  clampTablePageIndex,
  paginationForPageSize,
  useAdaptiveTablePageSize,
} from "@/hooks/use-adaptive-table-page-size";
import { formatActionClosureRate } from "@/lib/format-action-closure-rate";
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

function ResultCell({ value }: { value: PerformanceKpiValue }) {
  if (value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE") {
    return <DataAvailabilityDisplay availability={value.availability} />;
  }

  return <StatusDisplay status={value.result} />;
}

function AstmResultCell({ value }: { value: AstmKpiValue }) {
  if (value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE") {
    return <DataAvailabilityDisplay availability={value.availability} />;
  }

  return value.result ? <StatusDisplay status={value.result} /> : null;
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
}: {
  row: KpiRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const actions = row?.actions.openActions;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
        <SheetHeader>
          <SheetTitle>未关闭行动项</SheetTitle>
          <SheetDescription>
            {row ? `${row.store.displayName} · ${row.store.storeId}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {!actions || actions.availability === "UNAVAILABLE" ? (
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
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>行动项</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>到期日</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.items.map((action) => (
                    <TableRow key={action.actionId}>
                      <TableCell className="max-w-56 whitespace-normal">
                        <span className="font-medium">{action.action}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {action.actionId}
                        </span>
                      </TableCell>
                      <TableCell>{action.owner}</TableCell>
                      <TableCell>{action.dueDate}</TableCell>
                      <TableCell>
                        <ActionStatusDisplay status={action.sourceStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type KpiDataTableProps = {
  rows: readonly KpiRow[];
};

type KpiPaginationState =
  | { status: "UNMEASURED" }
  | { status: "READY"; pagination: AdaptivePagination };

const unmeasuredTablePagination: PaginationState = {
  pageIndex: 0,
  pageSize: 1,
};

export function KpiDataTable({ rows }: KpiDataTableProps) {
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [selectedRow, setSelectedRow] = useState<KpiRow | null>(null);
  const [isActionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [paginationState, setPaginationState] =
    useState<KpiPaginationState>({ status: "UNMEASURED" });
  const data = useMemo(
    () => (abnormalOnly ? rows.filter(rowHasNegativeResult) : rows),
    [abnormalOnly, rows],
  );
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
            cell: ({ row }) => <ResultCell value={row.original.training} />,
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
            cell: ({ row }) => <ResultCell value={row.original.drill} />,
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
            cell: ({ row }) => <ResultCell value={row.original.inspections} />,
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
            cell: ({ row }) => <AstmResultCell value={row.original.astmEvents} />,
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant={abnormalOnly ? "secondary" : "outline"}
          aria-pressed={abnormalOnly}
          onClick={() => {
            table.firstPage();
            setAbnormalOnly((current) => !current);
          }}
        >
          <ListFilter aria-hidden="true" />
          仅看异常
        </Button>
        <DataTableColumnVisibility table={table} labels={columnLabels} />
      </div>

      <div
        ref={tableFrameRef}
        className={dataTableFrameClassName}
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
            ) : displayedRows.length > 0 ? (
              displayedRows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  ref={rowIndex === 0 ? rowMeasurementRef : undefined}
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
                  {abnormalOnly ? "没有异常 KPI 记录。" : "没有 KPI 记录。"}
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
          共 {data.length} 家门店
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            第 {table.state.pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)} 页
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

      <ActionsSheet
        row={selectedRow}
        open={isActionsSheetOpen}
        onOpenChange={setActionsSheetOpen}
      />
    </div>
  );
}
