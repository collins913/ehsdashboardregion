"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DataTableQueryStatus = "READY" | "LOADING" | "ERROR";

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
    isRetainingResolvedSnapshot &&
    resolvedRef.current?.metadataKey !== metadataKey;

  return {
    snapshot: resolvedSnapshot,
    isRetainingResolvedSnapshot,
    isResolvedMetadataPending,
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
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <div
        aria-hidden={loading || undefined}
        inert={loading ? true : undefined}
        className={cn("min-w-0", loading && "invisible")}
      >
        {children}
      </div>
      {loading ? (
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
