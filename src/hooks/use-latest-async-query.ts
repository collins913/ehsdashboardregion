"use client";

import { useEffect, useRef, useState } from "react";

export type AsyncQueryState<T> =
  | { status: "IDLE" }
  | { status: "LOADING" }
  | { status: "SUCCESS"; data: T }
  | { status: "ERROR" };

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
  const [stored, setStored] = useState<{
    key: string | null;
    state: AsyncQueryState<T>;
  }>(() => ({
    key: queryKey,
    state: queryKey === null ? { status: "IDLE" } : { status: "LOADING" },
  }));

  useEffect(() => {
    const guard = guardRef.current!;
    const execute = loadRef.current;
    if (queryKey === null || !hasLoad || execute === null) {
      guard.invalidate();
      setStored({ key: null, state: { status: "IDLE" } });
      return;
    }

    const requestId = guard.begin();
    let active = true;
    setStored({ key: queryKey, state: { status: "LOADING" } });

    void execute().then(
      (data) => {
        if (active && guard.isLatest(requestId)) {
          setStored({ key: queryKey, state: { status: "SUCCESS", data } });
        }
      },
      () => {
        if (active && guard.isLatest(requestId)) {
          setStored({ key: queryKey, state: { status: "ERROR" } });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [hasLoad, queryKey]);

  if (stored.key !== queryKey) {
    return queryKey === null ? { status: "IDLE" } : { status: "LOADING" };
  }

  return stored.state;
}
