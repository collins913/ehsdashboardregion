"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  columnVisibilityFeature,
  type ColumnVisibilityState,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
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
  getStatusIntent,
  getStatusLabel,
  StatusDisplay,
} from "@/components/shared/status-display";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DataAvailability } from "@/data/contracts/kpi";
import type {
  ActionKpiValue,
  AstmKpiValue,
  KpiRow,
  PerformanceKpiValue,
} from "@/features/kpi/types";
import { formatActionClosureRate } from "@/lib/format-action-closure-rate";
import type {
  OccurrenceResult,
  PerformanceResult,
} from "@/lib/rules/result-types";

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

const availabilityLabels: Record<DataAvailability, string> = {
  AVAILABLE: "可用",
  CONFIRMED_EMPTY: "确认无数据",
  INCOMPLETE: "数据不完整",
  UNAVAILABLE: "数据不可用",
};

const availabilityDescriptions: Record<DataAvailability, string> = {
  AVAILABLE: "请求范围内的数据可用。",
  CONFIRMED_EMPTY: "请求范围已确认无记录。",
  INCOMPLETE: "请求范围内的数据不完整，无法支持业务结论。",
  UNAVAILABLE: "请求范围内的数据不可用。",
};

type KpiDataAvailabilityDisplayProps = {
  availability: DataAvailability;
};

export function KpiDataAvailabilityDisplay({
  availability,
}: KpiDataAvailabilityDisplayProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          data-availability={availability.toLowerCase()}
          className="border-dashed bg-background text-muted-foreground"
        >
          {availabilityLabels[availability]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{availabilityDescriptions[availability]}</TooltipContent>
    </Tooltip>
  );
}

function ResultCell({ value }: { value: PerformanceKpiValue }) {
  if (value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE") {
    return <KpiDataAvailabilityDisplay availability={value.availability} />;
  }

  return <StatusDisplay status={value.result} />;
}

function AstmResultCell({ value }: { value: AstmKpiValue }) {
  if (value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE") {
    return <KpiDataAvailabilityDisplay availability={value.availability} />;
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
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const updateTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    updateTruncation();
    const resizeObserver = new ResizeObserver(updateTruncation);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [isTruncated, name]);

  const label = (
    <span
      ref={textRef}
      className="block w-44 truncate font-medium"
      tabIndex={isTruncated ? 0 : undefined}
    >
      {name}
    </span>
  );

  if (!isTruncated) return label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

function ActionsCell({
  value,
  onOpen,
}: {
  value: ActionKpiValue;
  onOpen: () => void;
}) {
  if (value.availability === "INCOMPLETE" || value.availability === "UNAVAILABLE") {
    return <KpiDataAvailabilityDisplay availability={value.availability} />;
  }

  return (
    <Button
      variant="link"
      className="h-auto p-0 font-medium"
      onClick={onOpen}
      aria-label={`查看未关闭行动项，关闭率 ${formatActionClosureRate(value.value)}`}
    >
      {formatActionClosureRate(value.value)}
    </Button>
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
              <KpiDataAvailabilityDisplay availability="INCOMPLETE" />
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
                        <span className="font-medium">{action.actionTitle}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {action.actionId}
                        </span>
                      </TableCell>
                      <TableCell>{action.owner}</TableCell>
                      <TableCell>{action.dueDate}</TableCell>
                      <TableCell>{action.sourceStatus}</TableCell>
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

export function KpiDataTable({ rows }: KpiDataTableProps) {
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [selectedRow, setSelectedRow] = useState<KpiRow | null>(null);
  const [isActionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const data = useMemo(
    () => (abnormalOnly ? rows.filter(rowHasNegativeResult) : rows),
    [abnormalOnly, rows],
  );
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
    onPaginationChange: setPagination,
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

      <div className="overflow-hidden rounded-lg border">
        <Table className="min-w-224">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "store"
                        ? "sticky left-0 z-20 w-48 min-w-48 max-w-48 border-r bg-background"
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {displayedRows.length > 0 ? (
              displayedRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "store"
                          ? "sticky left-0 z-10 w-48 min-w-48 max-w-48 border-r bg-background"
                          : undefined
                      }
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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
