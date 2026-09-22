"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DataTableQueryStatus = "READY" | "LOADING" | "ERROR";
export type DataTablePendingMode = "preserve-visible" | "mask-content";

export function useResolvedDataTableSnapshot<TSnapshot>({
  snapshot,
  status,
  metadataKey,
}: {
  snapshot: TSnapshot | null;
  status: DataTableQueryStatus;
  metadataKey: string;
}) {
  const resolvedRef = useRef<{
    snapshot: TSnapshot;
    metadataKey: string;
  } | null>(null);

  useLayoutEffect(() => {
    if (status === "READY" && snapshot !== null) {
      resolvedRef.current = { snapshot, metadataKey };
    }
  }, [metadataKey, snapshot, status]);

  const resolvedSnapshot =
    status === "READY" && snapshot !== null
      ? snapshot
      : (resolvedRef.current?.snapshot ?? snapshot);
  const isRetainingResolvedSnapshot =
    status === "LOADING" && resolvedRef.current !== null;
  const isResolvedMetadataPending =
    status !== "READY" &&
    (resolvedRef.current === null ||
      resolvedRef.current.metadataKey !== metadataKey);
  const pendingMode: DataTablePendingMode =
    isRetainingResolvedSnapshot && !isResolvedMetadataPending
      ? "preserve-visible"
      : "mask-content";

  return {
    snapshot: resolvedSnapshot,
    isRetainingResolvedSnapshot,
    isResolvedMetadataPending,
    pendingMode,
  };
}

export function useRetainedDataTableRows<TRow>({
  rows,
  status,
}: {
  rows: readonly TRow[];
  status: DataTableQueryStatus;
}) {
  const resolvedRowsRef = useRef<readonly TRow[]>([]);

  useLayoutEffect(() => {
    if (status === "READY") {
      resolvedRowsRef.current = rows;
    }
  }, [rows, status]);

  const isRetainingResolvedRows =
    status === "LOADING" && resolvedRowsRef.current.length > 0;

  return {
    rows: isRetainingResolvedRows ? resolvedRowsRef.current : rows,
    isRetainingResolvedRows,
  };
}

export function DataTableLoadingCellContent({
  loading,
  pendingMode = "mask-content",
  children,
}: {
  loading: boolean;
  pendingMode?: DataTablePendingMode;
  children: ReactNode;
}) {
  const masked = loading && pendingMode === "mask-content";
  return (
    <div className="relative min-w-0">
      <div
        aria-hidden={masked || undefined}
        inert={loading ? true : undefined}
        className={cn("min-w-0", masked && "invisible")}
      >
        {children}
      </div>
      {masked ? (
        <div
          aria-hidden="true"
          data-table-loading-overlay
          className="pointer-events-none absolute inset-0 flex items-center"
        >
          <Skeleton className="h-4 w-full max-w-32 animate-none" />
        </div>
      ) : null}
    </div>
  );
}

export function DataTablePendingValue({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-grid min-w-[1ch] align-baseline">
      <span
        aria-hidden={pending || undefined}
        className={cn(pending && "invisible")}
      >
        {children}
      </span>
      {pending ? (
        <span
          aria-hidden="true"
          data-table-pending-value
          className="pointer-events-none absolute inset-0 flex items-center"
        >
          <span className="h-3 w-full min-w-3 rounded-md bg-muted" />
        </span>
      ) : null}
    </span>
  );
}

export function DataTablePendingFeedback({
  isPending,
}: {
  isPending: boolean;
}) {
  return (
    <span
      role={isPending ? "status" : undefined}
      aria-live="polite"
      className="inline-flex h-4 w-16 shrink-0 items-center gap-1 text-xs text-muted-foreground"
    >
      {isPending ? (
        <>
          <Loader2Icon aria-hidden="true" className="size-3 animate-spin" />
          加载中…
        </>
      ) : null}
    </span>
  );
}
