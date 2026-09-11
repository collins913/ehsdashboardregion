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
      type={type}
      variant="ghost"
      className={cn(
        "group/table-cell-trigger h-auto min-h-8 cursor-pointer px-1 py-0.5 hover:bg-transparent dark:hover:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
