import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
};

export function DataTableColumnHeader({
  column,
  title,
  className,
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
      className={cn("-ml-2", className)}
      onClick={() => column.toggleSorting(direction === "asc")}
      aria-label={`${title}: ${
        direction === "asc"
          ? "sorted ascending"
          : direction === "desc"
            ? "sorted descending"
            : "not sorted"
      }`}
    >
      {title}
      <SortIcon aria-hidden="true" />
    </Button>
  );
}
