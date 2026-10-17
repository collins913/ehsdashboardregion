import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableColumnAlignment } from "./data-table-layout";
import { cn } from "@/lib/utils";

type SortableColumn = {
  getCanSort: () => boolean;
  getIsSorted: () => false | "asc" | "desc";
  toggleSorting: (desc?: boolean, isMulti?: boolean) => void;
};

type DataTableColumnHeaderProps = {
  column: SortableColumn;
  title: string;
  className?: string;
  align?: DataTableColumnAlignment;
};

export function getColumnAriaSort(column: Pick<SortableColumn, "getIsSorted">) {
  const direction = column.getIsSorted();
  return direction === "asc" ? "ascending" as const : direction === "desc" ? "descending" as const : undefined;
}

export function DataTableColumnHeader({
  column,
  title,
  className,
  align = "left",
}: DataTableColumnHeaderProps) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const direction = column.getIsSorted();
  const SortIcon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
        ? ArrowDown
        : ChevronsUpDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(align === "left" ? "-ml-2.5" : align === "right" ? "-mr-2" : undefined, className)}
      onClick={() => column.toggleSorting(direction === "asc")}
      aria-label={`${title}: ${
        direction === "asc"
          ? "已按升序排列"
          : direction === "desc"
            ? "已按降序排列"
            : "未排序"
      }`}
    >
      {title}
      <SortIcon aria-hidden="true" />
    </Button>
  );
}
