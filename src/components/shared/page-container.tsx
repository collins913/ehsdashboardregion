import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-content px-(--page-padding) py-6 lg:py-8",
        className,
      )}
      {...props}
    />
  );
}
