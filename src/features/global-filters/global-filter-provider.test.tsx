import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ snapshot: undefined as unknown, effects: [] as (() => void)[], value: undefined as unknown, mounts: 0, effectIndex: 0, dependencies: [] as (readonly unknown[])[] }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useEffect: (effect: () => void, dependencies: readonly unknown[]) => {
    const index = harness.effectIndex++;
    const previous = harness.dependencies[index];
    if (!previous || dependencies.some((value, position) => !Object.is(value, previous[position]))) {
      harness.dependencies[index] = dependencies;
      harness.effects.push(effect);
    }
  },
  useState: (initial: unknown) => {
    if (harness.snapshot === undefined) harness.snapshot = initial;
    return [harness.snapshot, (update: unknown) => { harness.snapshot = typeof update === "function" ? update(harness.snapshot) : update; }];
  },
}));
vi.mock("@/components/shared/async-query-feedback", () => ({ AsyncQueryFeedback: () => createElement("p", null, "loading filters") }));
vi.mock("@/components/shared/page-container", () => ({ PageContainer: ({ children }: { children: import("react").ReactNode }) => children }));
import { GlobalFilterProvider, useGlobalFilters } from "./global-filter-provider";
import { createInitialGlobalFilterState } from "./global-filter-state";
import { globalFilterStorageKey } from "./global-filter-storage";

const stores = [{ storeId: "a", displayName: "甲店", region: "甲区", area: "一部" }];
const saved = { ...createInitialGlobalFilterState(), period: { mode: "THIS_MONTH" as const } };
let storage: Map<string, string>;
let setItem: ReturnType<typeof vi.fn>;
function Probe() {
  harness.mounts++;
  const value = useGlobalFilters();
  harness.value = value;
  return createElement("p", null, value.state.period.mode);
}
function render(email = "a@example.com", scope = stores) {
  if (harness.snapshot === undefined) harness.dependencies = [];
  harness.effectIndex = 0;
  return renderToStaticMarkup(createElement(GlobalFilterProvider, {
    stores: scope, userEmail: email, nowIso: "2026-10-17", referenceMonth: "2026-10", children: createElement(Probe),
  }));
}
function flush() { harness.effects.splice(0).forEach((effect) => effect()); }
function value() { return harness.value as ReturnType<typeof useGlobalFilters>; }

beforeEach(() => {
  harness.snapshot = undefined; harness.effects = []; harness.mounts = 0; harness.value = undefined; harness.dependencies = []; harness.effectIndex = 0;
  storage = new Map();
  setItem = vi.fn((key: string, item: string) => storage.set(key, item));
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem } });
});
describe("global filter persistence lifecycle", () => {
  it("does not mount query consumers or overwrite preferences before restoration", () => {
    storage.set(globalFilterStorageKey("a@example.com")!, JSON.stringify(saved));
    expect(render()).toContain("loading filters");
    expect(harness.mounts).toBe(0);
    flush();
    expect(setItem).not.toHaveBeenCalled();
    expect(render()).toContain("THIS_MONTH");
    flush();
    expect(value().filterContext?.period.includedMonths).toEqual(["2026-10"]);
  });
  it("saves updates and restores them after a fresh mount", () => {
    render(); flush(); render(); flush();
    value().setPeriodMode("CUSTOM");
    value().setCustomStartMonth("2026-03");
    value().setCustomEndMonth("2026-10");
    render(); flush();
    harness.snapshot = undefined;
    expect(render()).toContain("loading filters"); flush(); render(); flush();
    expect(value().state.period).toEqual({ mode: "CUSTOM", startMonth: "2026-03", endMonth: "2026-10" });
  });
  it("isolates users and blocks stale consumers while switching identity or options", () => {
    storage.set(globalFilterStorageKey("a@example.com")!, JSON.stringify(saved));
    render(); flush(); render(); flush();
    const before = harness.mounts;
    expect(render("b@example.com")).toContain("loading filters");
    expect(harness.mounts).toBe(before); flush();
    expect(render("b@example.com")).toContain("THIS_YEAR"); flush();
    expect(JSON.parse(storage.get(globalFilterStorageKey("a@example.com")!)!).period.mode).toBe("THIS_MONTH");
    const noStores: typeof stores = [];
    expect(render("b@example.com", noStores)).toContain("loading filters"); flush();
    expect(render("b@example.com", noStores)).toContain("THIS_YEAR");
    expect(value().state.store).toEqual({ kind: "ALL" });
  });
  it("keeps filtering usable if the browser blocks storage access or writes", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("blocked"); } });
    render(); flush(); expect(render()).toContain("THIS_YEAR"); flush();
    value().setPeriodMode("THIS_MONTH");
    expect(render()).toContain("THIS_MONTH"); expect(flush).not.toThrow();
  });
  it("does not overwrite a valid saved period while editing an incomplete range", () => {
    render(); flush(); render(); flush();
    const previous = storage.get(globalFilterStorageKey("a@example.com")!);
    value().setPeriodMode("CUSTOM"); render(); flush();
    expect(storage.get(globalFilterStorageKey("a@example.com")!)).toBe(previous);
  });
});
