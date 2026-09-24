"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
): AsyncQueryState<T> & { reload: () => Promise<void> } {
  const guardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(
    null,
  );
  if (guardRef.current === null) {
    guardRef.current = createLatestRequestGuard();
  }
  const loadRef = useRef(load);
  loadRef.current = load;
  const requestedKeyRef = useRef(queryKey);
  requestedKeyRef.current = queryKey;
  const hasLoad = load !== null;
  const mountedRef = useRef(false);
  const [stored, setStored] = useState<StoredAsyncQueryState<T>>(() => ({
    key: queryKey,
    state:
      queryKey === null || !hasLoad
        ? { status: "IDLE", resolved: null }
        : { status: "LOADING", resolved: null },
    resolved: null,
  }));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      guardRef.current?.invalidate();
    };
  }, []);

  useEffect(() => {
    const guard = guardRef.current!;
    const execute = loadRef.current;
    if (queryKey === null || !hasLoad || execute === null) {
      guard.invalidate();
      setStored({
        key: queryKey,
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

    const settleError = () => {
      if (active && guard.isLatest(requestId)) {
        setStored((current) => ({
          key: queryKey,
          state: { status: "ERROR", resolved: current.resolved },
          resolved: current.resolved,
        }));
      }
    };

    try {
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
        settleError,
      );
    } catch {
      settleError();
    }

    return () => {
      active = false;
    };
  }, [hasLoad, queryKey]);

  const reload = useCallback(async () => {
    const execute = loadRef.current;
    if (!mountedRef.current || queryKey === null || execute === null) return;
    const guard = guardRef.current!;
    const requestId = guard.begin();
    setStored((current) => ({
      key: queryKey,
      state: { status: "LOADING", resolved: current.resolved },
      resolved: current.resolved,
    }));
    try {
      const data = await execute();
      if (
        mountedRef.current &&
        guard.isLatest(requestId) &&
        requestedKeyRef.current === queryKey
      ) {
        const resolved = { key: queryKey, data };
        setStored({ key: queryKey, state: { status: "SUCCESS", data, resolved }, resolved });
      }
    } catch (error) {
      if (
        mountedRef.current &&
        guard.isLatest(requestId) &&
        requestedKeyRef.current === queryKey
      ) {
        setStored((current) => ({
          key: queryKey,
          state: { status: "ERROR", resolved: current.resolved },
          resolved: current.resolved,
        }));
      }
      throw error;
    }
  }, [queryKey]);

  if (queryKey === null || !hasLoad) {
    return { status: "IDLE", resolved: null, reload };
  }

  if (stored.key !== queryKey) {
    return queryKey === null
      ? { status: "IDLE", resolved: null, reload }
      : { status: "LOADING", resolved: stored.resolved, reload };
  }

  return { ...stored.state, reload };
}
