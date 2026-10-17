"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  FilterScope,
  EhsFilterContext,
  EhsStoreScope,
  KpiStore,
} from "@/data/contracts/kpi";
import type { Month, StoreId } from "@/types/ehs";
import {
  changeArea,
  changeRegion,
  createInitialGlobalFilterState,
  filterOptions,
  hasValidFilterScopes,
  type GlobalFilterState,
  type PeriodMode,
  toEhsFilterContext,
  toEhsStoreScope,
} from "@/features/global-filters/global-filter-state";

import { globalFilterStorageKey, loadGlobalFilters, restoreGlobalFilterState } from "./global-filter-storage";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";

type GlobalFiltersProviderValue = {
  state: GlobalFilterState;
  filterContext: EhsFilterContext | null;
  storeScope: EhsStoreScope | null;
  referenceDateIso: string;
  readiness: "READY" | "INVALID_PERIOD" | "INVALID_SCOPE";
  options: ReturnType<typeof filterOptions>;
  setRegion: (scope: FilterScope<string>) => void;
  setArea: (scope: FilterScope<string>) => void;
  setStore: (scope: FilterScope<StoreId>) => void;
  setPeriodMode: (mode: PeriodMode) => void;
  setCustomStartMonth: (month: Month | null) => void;
  setCustomEndMonth: (month: Month | null) => void;
};

const GlobalFiltersStateContext =
  createContext<GlobalFiltersProviderValue | null>(null);

type GlobalFilterProviderProps = {
  children: ReactNode;
  stores: readonly KpiStore[];
  initialState?: GlobalFilterState;
  nowIso: string;
  referenceMonth: Month;
  userEmail?: string;
};

export function GlobalFilterProvider({
  children,
  stores,
  initialState = createInitialGlobalFilterState(),
  nowIso,
  referenceMonth,
  userEmail,
}: GlobalFilterProviderProps) {
  const storageKey = globalFilterStorageKey(userEmail);
  const initialStateRef = useRef(initialState);
  const [snapshot, setSnapshot] = useState({ key: storageKey, stores, state: initialState, restored: storageKey === null });
  const state = snapshot.state;
  const restored = snapshot.restored && snapshot.key === storageKey && snapshot.stores === stores;
  const setState = useCallback((update: (current: GlobalFilterState) => GlobalFilterState) => {
    setSnapshot((current) => ({ ...current, state: update(current.state) }));
  }, []);
  useEffect(() => {
    let restoredState = restoreGlobalFilterState(initialStateRef.current, stores, initialStateRef.current);
    try {
      if (storageKey !== null) restoredState = loadGlobalFilters(window.localStorage, storageKey, stores, restoredState);
    } catch {
      // Storage may be disabled; keep usable defaults and continue normally.
    }
    setSnapshot({ key: storageKey, stores, state: restoredState, restored: true });
  }, [storageKey, stores]);
  const storeScope = useMemo(
    () => toEhsStoreScope(state, stores),
    [state.region, state.area, state.store, stores],
  );
  const filterContext = useMemo(
    () => toEhsFilterContext(state, referenceMonth, stores),
    [referenceMonth, state, stores],
  );
  useEffect(() => {
    if (!restored || storageKey === null || filterContext === null) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Persistence is optional; unavailable storage must not block filtering.
    }
  }, [restored, storageKey, state, filterContext]);
  const readiness = useMemo(
    () =>
      filterContext !== null
        ? "READY"
        : hasValidFilterScopes(state, stores)
          ? "INVALID_PERIOD"
          : "INVALID_SCOPE",
    [filterContext, state, stores],
  );
  const options = useMemo(() => filterOptions(stores, state), [state, stores]);

  const setRegion = useCallback(
    (scope: FilterScope<string>) => {
      setState((current) => changeRegion(current, scope, stores));
    },
    [stores],
  );
  const setArea = useCallback(
    (scope: FilterScope<string>) => {
      setState((current) => changeArea(current, scope, stores));
    },
    [stores],
  );
  const setStore = useCallback((scope: FilterScope<StoreId>) => {
    setState((current) => ({ ...current, store: scope }));
  }, []);
  const setPeriodMode = useCallback((mode: PeriodMode) => {
    setState((current) => ({
      ...current,
      period:
        mode === "CUSTOM"
          ? { mode, startMonth: null, endMonth: null }
          : { mode },
    }));
  }, []);
  const setCustomStartMonth = useCallback((month: Month | null) => {
    setState((current) =>
      current.period.mode === "CUSTOM"
        ? {
            ...current,
            period: { ...current.period, startMonth: month },
          }
        : current,
    );
  }, []);
  const setCustomEndMonth = useCallback((month: Month | null) => {
    setState((current) =>
      current.period.mode === "CUSTOM"
        ? {
            ...current,
            period: { ...current.period, endMonth: month },
          }
        : current,
    );
  }, []);

  const value = useMemo<GlobalFiltersProviderValue>(
    () => ({
      state,
      filterContext,
      storeScope,
      referenceDateIso: nowIso,
      readiness,
      options,
      setRegion,
      setArea,
      setStore,
      setPeriodMode,
      setCustomStartMonth,
      setCustomEndMonth,
    }),
    [
      filterContext,
      storeScope,
      nowIso,
      options,
      readiness,
      setArea,
      setCustomEndMonth,
      setCustomStartMonth,
      setPeriodMode,
      setRegion,
      setStore,
      state,
    ],
  );

  return (
    <GlobalFiltersStateContext.Provider value={value}>
      {restored ? children : <PageContainer><AsyncQueryFeedback status="LOADING" /></PageContainer>}
    </GlobalFiltersStateContext.Provider>
  );
}

export function useGlobalFilters(): GlobalFiltersProviderValue {
  const context = useContext(GlobalFiltersStateContext);

  if (context === null) {
    throw new Error("useGlobalFilters must be used within GlobalFilterProvider.");
  }

  return context;
}
