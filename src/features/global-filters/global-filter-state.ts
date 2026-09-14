import type {
  FilterScope,
  EhsFilterContext,
  KpiStore,
} from "@/data/contracts/kpi";
import {
  BUSINESS_TIME_ZONE,
  includedMonthsBetween,
  periodForMode,
  periodForModeFromMonth,
  periodFromMonthRange,
  shanghaiYearMonth,
} from "@/data/contracts/kpi-period";
import type { Month, StoreId } from "@/types/ehs";

export {
  BUSINESS_TIME_ZONE,
  includedMonthsBetween,
  periodForMode,
  periodForModeFromMonth,
  periodFromMonthRange,
  shanghaiYearMonth,
};

export type PeriodMode =
  | "THIS_YEAR"
  | "THIS_QUARTER"
  | "THIS_MONTH"
  | "CUSTOM";

export type PeriodSelection =
  | { mode: Exclude<PeriodMode, "CUSTOM"> }
  | {
      mode: "CUSTOM";
      startMonth: Month | null;
      endMonth: Month | null;
    };

export interface GlobalFilterState {
  region: FilterScope<string>;
  area: FilterScope<string>;
  store: FilterScope<StoreId>;
  period: PeriodSelection;
}

function all<T>(): FilterScope<T> {
  return { kind: "ALL" };
}

export function createInitialGlobalFilterState(): GlobalFilterState {
  return {
    region: all(),
    area: all(),
    store: all(),
    period: { mode: "THIS_QUARTER" },
  };
}

function scopeIncludes<T>(scope: FilterScope<T>, value: T): boolean {
  return scope.kind === "ALL" || scope.values.includes(value);
}

function storesInScope(
  stores: readonly KpiStore[],
  region: FilterScope<string>,
  area: FilterScope<string>,
): readonly KpiStore[] {
  return stores.filter(
    (store) =>
      scopeIncludes(region, store.region) && scopeIncludes(area, store.area),
  );
}

function retainValidStores(
  scope: FilterScope<StoreId>,
  validStores: readonly KpiStore[],
): FilterScope<StoreId> {
  if (scope.kind === "ALL") {
    return scope;
  }

  const validIds = new Set(validStores.map((store) => store.storeId));
  const values = scope.values.filter((storeId) => validIds.has(storeId));

  return values.length === 0
    ? all()
    : {
        kind: "INCLUDE",
        values: values as [StoreId, ...StoreId[]],
      };
}

export function changeRegion(
  state: GlobalFilterState,
  region: FilterScope<string>,
  stores: readonly KpiStore[],
): GlobalFilterState {
  const validAreas = new Set(
    stores
      .filter((store) => scopeIncludes(region, store.region))
      .map((store) => store.area),
  );
  const area =
    state.area.kind === "INCLUDE" &&
    state.area.values.every((value) => validAreas.has(value))
      ? state.area
      : all<string>();

  return {
    ...state,
    region,
    area,
    store: retainValidStores(
      state.store,
      storesInScope(stores, region, area),
    ),
  };
}

export function changeArea(
  state: GlobalFilterState,
  area: FilterScope<string>,
  stores: readonly KpiStore[],
): GlobalFilterState {
  return {
    ...state,
    area,
    store: retainValidStores(
      state.store,
      storesInScope(stores, state.region, area),
    ),
  };
}

export function toEhsFilterContext(
  state: GlobalFilterState,
  referenceDate: Date | Month,
  stores: readonly KpiStore[],
): EhsFilterContext | null {
  const period =
    state.period.mode === "CUSTOM"
      ? state.period.startMonth !== null && state.period.endMonth !== null
        ? periodFromMonthRange(
            state.period.startMonth,
            state.period.endMonth,
          )
        : null
      : typeof referenceDate === "string"
        ? periodForModeFromMonth(state.period.mode, referenceDate)
        : periodForMode(state.period.mode, referenceDate);

  const hasValidScope = hasValidFilterScopes(state, stores);

  return period === null || !hasValidScope
    ? null
    : {
        region: state.region,
        area: state.area,
        store: state.store,
        period,
      };
}

export function hasValidFilterScopes(
  state: GlobalFilterState,
  stores: readonly KpiStore[],
): boolean {
  const validRegions = new Set(stores.map((store) => store.region));
  const validAreas = new Set(
    stores
      .filter((store) => scopeIncludes(state.region, store.region))
      .map((store) => store.area),
  );
  const validStoreIds = new Set(
    storesInScope(stores, state.region, state.area).map(
      (store) => store.storeId,
    ),
  );
  return (
    (state.region.kind === "ALL" ||
      (state.region.values.length > 0 &&
        state.region.values.every((value) => validRegions.has(value)))) &&
    (state.area.kind === "ALL" ||
      (state.area.values.length > 0 &&
        state.area.values.every((value) => validAreas.has(value)))) &&
    (state.store.kind === "ALL" ||
      (state.store.values.length > 0 &&
        state.store.values.every((value) => validStoreIds.has(value))))
  );
}

export function filterOptions(stores: readonly KpiStore[], state: GlobalFilterState) {
  const regions = [...new Set(stores.map((store) => store.region))].sort();
  const areas = [
    ...new Set(
      stores
        .filter((store) => scopeIncludes(state.region, store.region))
        .map((store) => store.area),
    ),
  ].sort();
  const scopedStores = storesInScope(stores, state.region, state.area);

  return { regions, areas, stores: scopedStores };
}
