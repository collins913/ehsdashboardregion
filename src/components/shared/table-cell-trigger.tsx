import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TableCellTriggerProps = Omit<
  ComponentProps<typeof Button>,
  "asChild" | "size" | "variant"
>;

export function TableCellTrigger({
  className,
  type = "button",
  ...props
}: TableCellTriggerProps) {
  return (
    <Button
      data-table-cell-trigger
      type={type}
      variant="ghost"
      size="sm"
      className={cn(
        "group/table-cell-trigger cursor-pointer has-data-[slot=badge]:hover:bg-transparent dark:has-data-[slot=badge]:hover:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
