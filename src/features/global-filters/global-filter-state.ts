import type {
  FilterScope,
  KpiFilterContext,
  KpiPeriod,
  KpiStore,
  TimezoneAwareIsoDateTime,
} from "@/data/contracts/kpi";
import type { Month, StoreId } from "@/types/ehs";

export const BUSINESS_TIME_ZONE = "Asia/Shanghai";

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

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const SHANGHAI_OFFSET = "+08:00";

function all<T>(): FilterScope<T> {
  return { kind: "ALL" };
}

function monthIndex(month: Month): number | null {
  const match = MONTH_PATTERN.exec(month);

  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  return monthNumber >= 1 && monthNumber <= 12
    ? year * 12 + monthNumber - 1
    : null;
}

function monthFromIndex(index: number): Month {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}` as Month;
}

export function includedMonthsBetween(
  startMonth: Month,
  endMonth: Month,
): readonly [Month, ...Month[]] | null {
  const startIndex = monthIndex(startMonth);
  const endIndex = monthIndex(endMonth);

  if (startIndex === null || endIndex === null || startIndex > endIndex) {
    return null;
  }

  const months: Month[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    months.push(monthFromIndex(index));
  }

  return months as [Month, ...Month[]];
}

export function periodFromMonthRange(
  startMonth: Month,
  endMonth: Month,
): KpiPeriod | null {
  const includedMonths = includedMonthsBetween(startMonth, endMonth);
  const endIndex = monthIndex(endMonth);

  if (includedMonths === null || endIndex === null) {
    return null;
  }

  const nextMonth = monthFromIndex(endIndex + 1);

  return {
    startInclusive:
      `${startMonth}-01T00:00:00${SHANGHAI_OFFSET}` as TimezoneAwareIsoDateTime,
    endExclusive:
      `${nextMonth}-01T00:00:00${SHANGHAI_OFFSET}` as TimezoneAwareIsoDateTime,
    includedMonths,
  };
}

export function shanghaiYearMonth(now: Date): {
  year: number;
  month: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Unable to resolve the current Asia/Shanghai month.");
  }

  return { year, month };
}

export function periodForMode(
  mode: Exclude<PeriodMode, "CUSTOM">,
  now: Date,
): KpiPeriod {
  const { year, month } = shanghaiYearMonth(now);
  let startMonth: Month;
  let endMonth: Month;

  if (mode === "THIS_YEAR") {
    startMonth = `${year}-01` as Month;
    endMonth = `${year}-12` as Month;
  } else if (mode === "THIS_QUARTER") {
    const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
    startMonth = `${year}-${String(quarterStart).padStart(2, "0")}` as Month;
    endMonth = `${year}-${String(quarterStart + 2).padStart(2, "0")}` as Month;
  } else {
    startMonth = `${year}-${String(month).padStart(2, "0")}` as Month;
    endMonth = startMonth;
  }

  const period = periodFromMonthRange(startMonth, endMonth);

  if (period === null) {
    throw new Error("Unable to build a complete natural-month period.");
  }

  return period;
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

export function toKpiFilterContext(
  state: GlobalFilterState,
  now: Date,
  stores: readonly KpiStore[],
): KpiFilterContext | null {
  const period =
    state.period.mode === "CUSTOM"
      ? state.period.startMonth !== null && state.period.endMonth !== null
        ? periodFromMonthRange(
            state.period.startMonth,
            state.period.endMonth,
          )
        : null
      : periodForMode(state.period.mode, now);

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
