"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  FilterScope,
  EhsFilterContext,
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
} from "@/features/global-filters/global-filter-state";

type GlobalFiltersProviderValue = {
  state: GlobalFilterState;
  filterContext: EhsFilterContext | null;
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
};

export function GlobalFilterProvider({
  children,
  stores,
  initialState = createInitialGlobalFilterState(),
  nowIso,
  referenceMonth,
}: GlobalFilterProviderProps) {
  const [state, setState] = useState(initialState);
  const filterContext = useMemo(
    () => toEhsFilterContext(state, referenceMonth, stores),
    [referenceMonth, state, stores],
  );
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
      {children}
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
