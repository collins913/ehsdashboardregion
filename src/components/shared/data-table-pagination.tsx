"use client";

import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { DataTablePendingFeedback, DataTablePendingValue } from "./data-table-loading";
import { cn } from "@/lib/utils";

export function DataTablePagination({
  ref,
  children,
  ready,
  busy,
  disabled,
  pageIndex,
  pageCount,
  metadataPending,
  pendingFeedback,
  canPreviousPage,
  canNextPage,
  onPreviousPage,
  onNextPage,
  className,
}: {
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
  ready: boolean;
  busy?: boolean;
  disabled: boolean;
  pageIndex: number;
  pageCount: number;
  metadataPending: boolean;
  /** Undefined omits the feedback slot; false retains its reserved width. */
  pendingFeedback?: boolean;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  className?: string;
}) {
  return (
    <div
      ref={ref}
      aria-busy={busy}
      aria-hidden={!ready}
      className={cn("flex flex-wrap items-center justify-between gap-3", !ready && "invisible", className)}
    >
      {children}
      <div className="flex items-center gap-2">
        {pendingFeedback !== undefined ? <DataTablePendingFeedback isPending={pendingFeedback} /> : null}
        <span className="text-sm text-muted-foreground">
          第 <DataTablePendingValue pending={metadataPending}>{pageIndex + 1}</DataTablePendingValue> / <DataTablePendingValue pending={metadataPending}>{pageCount}</DataTablePendingValue> 页
        </span>
        <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={disabled || !canPreviousPage}>
          上一页
        </Button>
        <Button variant="outline" size="sm" onClick={onNextPage} disabled={disabled || !canNextPage}>
          下一页
        </Button>
      </div>
    </div>
  );
}
