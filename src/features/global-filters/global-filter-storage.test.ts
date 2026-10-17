import { describe, expect, it } from "vitest";
import { areaScopeId } from "@/data/contracts/kpi";
import { createInitialGlobalFilterState, toEhsFilterContext } from "./global-filter-state";
import { globalFilterStorageKey, loadGlobalFilters, restoreGlobalFilterState } from "./global-filter-storage";

const stores = [
  { storeId: "a", displayName: "甲店", region: "甲区", area: "一部" },
  { storeId: "b", displayName: "乙店", region: "乙区", area: "一部" },
];
const saved = {
  region: { kind: "INCLUDE", values: ["甲区"] },
  area: { kind: "INCLUDE", values: [areaScopeId("甲区", "一部")] },
  store: { kind: "INCLUDE", values: ["a"] },
  period: { mode: "CUSTOM", startMonth: "2026-03", endMonth: "2026-10" },
};

describe("global filter preferences", () => {
  it("normalizes email keys and never uses an anonymous shared key", () => {
    expect(globalFilterStorageKey(" User@Example.com ")).toBe(globalFilterStorageKey("user@example.com"));
    expect(globalFilterStorageKey("a@example.com")).not.toBe(globalFilterStorageKey("b@example.com"));
    expect(globalFilterStorageKey()).toBeNull();
    expect(globalFilterStorageKey(" ")).toBeNull();
  });
  it("restores all dimensions including a custom period", () => {
    expect(restoreGlobalFilterState(saved, stores)).toEqual(saved);
  });
  it("retains valid selections and drops deleted or inaccessible options hierarchically", () => {
    expect(restoreGlobalFilterState({ ...saved, store: { kind: "INCLUDE", values: ["a", "b", "deleted", "a"] } }, stores).store).toEqual({ kind: "INCLUDE", values: ["a"] });
    const restored = restoreGlobalFilterState(saved, [stores[1]]);
    expect(restored).toEqual({ ...createInitialGlobalFilterState(), period: saved.period });
    expect(toEhsFilterContext(restored, "2026-10", [stores[1]])).not.toBeNull();
  });
  it.each([null, [], "bad", { region: { kind: "INCLUDE", values: [1] }, period: { mode: "CUSTOM", startMonth: "2026-13", endMonth: "2026-10" } }, { period: { mode: "CUSTOM", startMonth: "2026-11", endMonth: "2026-10" } }])("falls back for malformed preferences: %j", (value) => {
    expect(restoreGlobalFilterState(value, stores)).toEqual(createInitialGlobalFilterState());
  });
  it.each(["THIS_YEAR", "THIS_QUARTER", "THIS_MONTH"])("restores rolling %s without freezing its resolved dates", (mode) => {
    const state = restoreGlobalFilterState({ ...saved, period: { mode } }, stores);
    expect(state.period).toEqual({ mode });
  });
  it("handles corrupt JSON, missing keys and disabled storage", () => {
    const fallback = createInitialGlobalFilterState();
    expect(loadGlobalFilters({ getItem: () => "{" }, "key", stores, fallback)).toBe(fallback);
    expect(loadGlobalFilters({ getItem: () => null }, "key", stores, fallback)).toBe(fallback);
    expect(loadGlobalFilters({ getItem: () => { throw new Error("blocked"); } }, "key", stores, fallback)).toBe(fallback);
  });
});
