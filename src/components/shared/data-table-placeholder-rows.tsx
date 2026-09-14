import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTablePlaceholderColumn = {
  id: string;
  className?: string;
};

export function DataTablePlaceholderRows({
  columns,
  rowCount,
  hidden = false,
}: {
  columns: readonly DataTablePlaceholderColumn[];
  rowCount: number;
  hidden?: boolean;
}) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <TableRow
      key={`placeholder-${rowIndex}`}
      aria-hidden="true"
      data-table-placeholder-row
      className={cn(
        "pointer-events-none hover:bg-transparent",
        hidden && "invisible",
      )}
    >
      {columns.map((column) => (
        <TableCell key={column.id} className={column.className}>
          <div className="flex h-8 items-center">
            <Skeleton className="h-4 w-full max-w-32" />
          </div>
        </TableCell>
      ))}
    </TableRow>
  ));
}
