import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TableCellTriggerProps = Omit<
  ComponentProps<typeof Button>,
  "asChild" | "size" | "variant"
> & { variant?: "ghost" | "link" };

export function TableCellTrigger({
  className,
  type = "button",
  variant = "link",
  ...props
}: TableCellTriggerProps) {
  return (
    <Button
      data-table-cell-trigger
      type={type}
      variant={variant}
      size="sm"
      className={cn(
        "group/table-cell-trigger cursor-pointer has-data-[ui-badge]:hover:bg-transparent dark:has-data-[ui-badge]:hover:bg-transparent",
        variant === "link" && "hover:no-underline not-has-data-[ui-badge]:hover:underline",
        className,
      )}
      {...props}
    />
  );
}
