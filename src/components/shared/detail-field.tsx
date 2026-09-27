import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DetailField({
  label,
  children,
  className,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 whitespace-pre-wrap break-words", valueClassName)}>{children}</dd>
    </div>
  );
}
