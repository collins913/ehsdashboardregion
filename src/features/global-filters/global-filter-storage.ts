import type { Month } from "@/types/ehs";
import { type FilterScope, type KpiStore } from "@/data/contracts/kpi";
import {
  createInitialGlobalFilterState,
  filterOptions,
  periodFromMonthRange,
  type GlobalFilterState,
} from "./global-filter-state";

export function globalFilterStorageKey(email?: string): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? `ehs:global-filters:v1:${normalized}` : null;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMonth(value: unknown): value is Month {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function restoreScope(value: unknown, allowed: readonly string[]): FilterScope<string> {
  if (!object(value) || value.kind !== "INCLUDE" || !Array.isArray(value.values)) return { kind: "ALL" };
  const values = [...new Set(value.values.filter((item): item is string => typeof item === "string" && allowed.includes(item)))];
  return values.length ? { kind: "INCLUDE", values: values as [string, ...string[]] } : { kind: "ALL" };
}

// Validate preferences against server-provided options; this does not grant access.
export function restoreGlobalFilterState(value: unknown, stores: readonly KpiStore[], fallback = createInitialGlobalFilterState()): GlobalFilterState {
  if (!object(value)) return fallback;
  const state = createInitialGlobalFilterState();
  state.region = restoreScope(value.region, filterOptions(stores, state).regions);
  state.area = restoreScope(value.area, filterOptions(stores, state).areas.map(({ value }) => value));
  state.store = restoreScope(value.store, filterOptions(stores, state).stores.map(({ storeId }) => storeId));
  state.period = fallback.period;
  if (object(value.period)) {
    const period = value.period;
    if (period.mode === "THIS_YEAR" || period.mode === "THIS_QUARTER" || period.mode === "THIS_MONTH") {
      state.period = { mode: period.mode };
    } else if (period.mode === "CUSTOM" && isMonth(period.startMonth) && isMonth(period.endMonth) && periodFromMonthRange(period.startMonth, period.endMonth)) {
      state.period = { mode: "CUSTOM", startMonth: period.startMonth, endMonth: period.endMonth };
    }
  }
  return state;
}

export function loadGlobalFilters(storage: Pick<Storage, "getItem">, key: string, stores: readonly KpiStore[], fallback: GlobalFilterState): GlobalFilterState {
  try {
    const saved = storage.getItem(key);
    return saved === null ? fallback : restoreGlobalFilterState(JSON.parse(saved), stores, fallback);
  } catch {
    return fallback;
  }
}
