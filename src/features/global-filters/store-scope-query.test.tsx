import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { KpiStore } from "@/data/contracts/kpi";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildCertificateOverview } from "@/lib/rules/certificate-requirements";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { StoresPageContent } from "@/features/stores/stores-page-content";
import { EnvironmentPageContent } from "@/features/environment/environment-page-content";
import { CertificatesPageContent } from "@/features/certificates/certificates-page-content";
import { ActionsPageContent } from "@/features/actions/actions-page-content";
import { createInitialGlobalFilterState, toEhsFilterContext, toEhsStoreScope, type GlobalFilterState } from "./global-filter-state";

// Controlled hook lifecycle: execute the real async hook without needing browser layout.
const runtime = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  dependencies: undefined as unknown[] | undefined,
  cleanup: undefined as (() => void) | undefined,
  effect: undefined as (() => void | (() => void)) | undefined,
  filters: {} as Record<string, unknown>,
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
  useRef: (initial: unknown) => {
    const index = runtime.cursor++;
    return runtime.slots[index] ??= { current: initial };
  },
  useState: (initial: unknown) => {
    const index = runtime.cursor++;
    if (!(index in runtime.slots)) runtime.slots[index] = typeof initial === "function" ? initial() : initial;
    return [runtime.slots[index], (next: unknown) => {
      runtime.slots[index] = typeof next === "function" ? next(runtime.slots[index]) : next;
    }];
  },
  useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => {
    if (!runtime.dependencies || dependencies.some((value, index) => !Object.is(value, runtime.dependencies![index]))) {
      runtime.cleanup?.();
      runtime.dependencies = dependencies;
      runtime.effect = effect;
    }
  },
}));
vi.mock("./global-filter-provider", () => ({ useGlobalFilters: () => runtime.filters }));

const initialReferenceDateIso = "2026-09-15T00:00:00+08:00";
let referenceDateIso = initialReferenceDateIso;
const dataset = createKpiMockData(new Date(initialReferenceDateIso));
const repository = createMockEhsRepository(new Date(referenceDateIso));
const stores: readonly KpiStore[] = await repository.getFilterStores();
let state: GlobalFilterState;
function render(page: () => ReactElement): ReactElement {
  runtime.filters = { storeScope: toEhsStoreScope(state, stores), filterContext: toEhsFilterContext(state, "2026-09", stores), referenceDateIso };
  runtime.cursor = 0;
  const element = page();
  const effect = runtime.effect;
  runtime.effect = undefined;
  if (effect) runtime.cleanup = effect() || undefined;
  return element;
}
function tableProps(element: ReactElement): Record<string, unknown> | undefined {
  const props = element.props as Record<string, unknown>;
  if ("queryStatus" in props || ("context" in props && "queryActions" in props)) return props;
  const children = Array.isArray(props.children) ? props.children : [props.children];
  for (const child of children) {
    if (child && typeof child === "object" && "props" in child) {
      const found = tableProps(child as ReactElement);
      if (found) return found;
    }
  }
}
beforeEach(() => {
  runtime.cleanup?.(); runtime.slots = []; runtime.dependencies = undefined;
  runtime.cleanup = undefined; runtime.effect = undefined;
  state = createInitialGlobalFilterState();
  referenceDateIso = initialReferenceDateIso;
});

const modules = [
  { name: "Stores", query: vi.fn(({ query }) => repository.getStores({ context: query })), page: StoresPageContent, prop: "queryStores" },
  { name: "Environment", query: vi.fn(({ query }) => repository.getEnvironment({ context: query })), page: EnvironmentPageContent, prop: "queryEnvironment" },
  { name: "Certificates", query: vi.fn(async ({ query, referenceDateIso }) => {
    const certificates = await createMockEhsRepository(new Date(referenceDateIso), { dataset }).getCertificates({ context: query });
    return { ...certificates, overview: buildCertificateOverview(certificates) };
  }), page: CertificatesPageContent, prop: "queryCertificates" },
] as const;
describe.each(modules)("$name Store-scope dependency", ({ name, query, page, prop }) => {
  // The discriminated page signatures are exercised through their actual query prop.
  const view = () => (page as (props: never) => ReactElement)({ [prop]: query } as never);
  async function loaded() {
    render(view);
    await vi.waitFor(() => expect(tableProps(render(view))?.queryStatus).toBe("READY"));
    return tableProps(render(view))!;
  }
  it("uses referenceDate only for Certificates query identity", async () => {
    query.mockClear();
    const before = await loaded();
    referenceDateIso = "2026-09-16T00:00:00+08:00";
    const during = tableProps(render(view))!;
    if (name === "Certificates") {
      expect(during.queryStatus).toBe("LOADING");
      expect(during.queryKey).not.toBe(before.queryKey);
      const after = await loaded();
      expect(query).toHaveBeenCalledTimes(2);
      expect(after.rows).not.toEqual(before.rows);
    } else {
      expect(during.queryStatus).toBe("READY");
      expect(during.queryKey).toBe(before.queryKey);
      expect(during.rows).toEqual(before.rows);
      await Promise.resolve();
      expect(query).toHaveBeenCalledTimes(1);
    }
  });
  it("queries from an initially incomplete Period without inventing a Period", async () => {
    query.mockClear();
    state = { ...state, period: { mode: "CUSTOM", startMonth: null, endMonth: null } };
    await loaded();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].query).not.toHaveProperty("period");
  });
  it("still rejects an invalid canonical Store scope", () => {
    query.mockClear();
    state = { ...state, store: { kind: "INCLUDE", values: ["unknown-store"] } };
    expect(toEhsStoreScope(state, stores)).toBeNull();
    expect(tableProps(render(view))).toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });
  it("retains ready rows and never queries across valid → invalid → valid Period changes", async () => {
    query.mockClear();
    const before = await loaded();
    for (const period of [
      { mode: "THIS_MONTH" } as const,
      { mode: "CUSTOM", startMonth: null, endMonth: null } as const,
      { mode: "CUSTOM", startMonth: "2026-08", endMonth: null } as const,
      { mode: "CUSTOM", startMonth: "2026-08", endMonth: "2026-09" } as const,
    ]) {
      state = { ...state, period };
      const during = tableProps(render(view));
      expect(during?.queryStatus).toBe("READY");
      expect(during?.rows).toEqual(before.rows);
      await Promise.resolve();
      expect(query).toHaveBeenCalledTimes(1);
    }
    expect(query.mock.calls[0][0].query).not.toHaveProperty("period");
  });
  it.each(["region", "area", "store"] as const)("queries the changed %s scope even during invalid Period", async (dimension) => {
    query.mockClear();
    const before = await loaded();
    state = { ...state, period: { mode: "CUSTOM", startMonth: null, endMonth: null }, [dimension]: { kind: "INCLUDE", values: [dimension === "store" ? stores[0].storeId : stores[0][dimension]] } };
    expect(tableProps(render(view))?.queryStatus).toBe("LOADING");
    const after = await loaded();
    expect(query).toHaveBeenCalledTimes(2);
    const selected = (before.rows as { storeId: string }[]).filter((row) => {
      const store = stores.find((store) => store.storeId === row.storeId)!;
      return dimension === "store" ? store.storeId === stores[0].storeId : store[dimension] === stores[0][dimension];
    });
    expect(after.rows).toEqual(selected);
    expect(query.mock.calls[1][0].query).toEqual(toEhsStoreScope(state, stores));
  });
});
it("Actions still waits for a complete Period and resumes with the actual Period", () => {
  const queryActions = vi.fn();
  const queryActionsAnalytics = vi.fn();
  state = { ...state, period: { mode: "CUSTOM", startMonth: null, endMonth: null } };
  expect(toEhsStoreScope(state, stores)).not.toBeNull();
  const waiting = render(() => ActionsPageContent({ queryActions, queryActionsAnalytics }));
  expect(tableProps(waiting)).toBeUndefined();
  expect(JSON.stringify(waiting)).toContain("当前筛选条件尚不能生成行动项数据");
  state = { ...state, period: { mode: "THIS_MONTH" } };
  const ready = render(() => ActionsPageContent({ queryActions, queryActionsAnalytics }));
  expect(tableProps(ready)?.context).toEqual(toEhsFilterContext(state, "2026-09", stores));
});
