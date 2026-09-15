"use client";

import { useEffect, useRef, useState } from "react";

export type ResolvedAsyncQuery<T> = {
  key: string;
  data: T;
};

export type AsyncQueryState<T> =
  | { status: "IDLE"; resolved: null }
  | { status: "LOADING"; resolved: ResolvedAsyncQuery<T> | null }
  | { status: "SUCCESS"; data: T; resolved: ResolvedAsyncQuery<T> }
  | { status: "ERROR"; resolved: ResolvedAsyncQuery<T> | null };

type StoredAsyncQueryState<T> = {
  key: string | null;
  state: AsyncQueryState<T>;
  resolved: ResolvedAsyncQuery<T> | null;
};

export function createLatestRequestGuard() {
  let latestRequestId = 0;

  return {
    begin() {
      latestRequestId += 1;
      return latestRequestId;
    },
    isLatest(requestId: number) {
      return requestId === latestRequestId;
    },
    invalidate() {
      latestRequestId += 1;
    },
  };
}

export function useLatestAsyncQuery<T>(
  queryKey: string | null,
  load: (() => Promise<T>) | null,
): AsyncQueryState<T> {
  const guardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(
    null,
  );
  if (guardRef.current === null) {
    guardRef.current = createLatestRequestGuard();
  }
  const loadRef = useRef(load);
  loadRef.current = load;
  const hasLoad = load !== null;
  const [stored, setStored] = useState<StoredAsyncQueryState<T>>(() => ({
    key: queryKey,
    state:
      queryKey === null
        ? { status: "IDLE", resolved: null }
        : { status: "LOADING", resolved: null },
    resolved: null,
  }));

  useEffect(() => {
    const guard = guardRef.current!;
    const execute = loadRef.current;
    if (queryKey === null || !hasLoad || execute === null) {
      guard.invalidate();
      setStored({
        key: null,
        state: { status: "IDLE", resolved: null },
        resolved: null,
      });
      return;
    }

    const requestId = guard.begin();
    let active = true;
    setStored((current) => ({
      key: queryKey,
      state: { status: "LOADING", resolved: current.resolved },
      resolved: current.resolved,
    }));

    void execute().then(
      (data) => {
        if (active && guard.isLatest(requestId)) {
          const resolved = { key: queryKey, data };
          setStored({
            key: queryKey,
            state: { status: "SUCCESS", data, resolved },
            resolved,
          });
        }
      },
      () => {
        if (active && guard.isLatest(requestId)) {
          setStored((current) => ({
            key: queryKey,
            state: { status: "ERROR", resolved: current.resolved },
            resolved: current.resolved,
          }));
        }
      },
    );

    return () => {
      active = false;
    };
  }, [hasLoad, queryKey]);

  if (stored.key !== queryKey) {
    return queryKey === null
      ? { status: "IDLE", resolved: null }
      : { status: "LOADING", resolved: stored.resolved };
  }

  return stored.state;
}
