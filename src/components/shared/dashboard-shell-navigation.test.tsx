import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/performance/kpi", target: null as string | null, pending: false, calls: [] as string[], intent: { current: false }, effects: [] as (() => void)[], navigate: undefined as undefined | ((href: string) => void) }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: () => navigation.intent,
  useEffect: (effect: () => void) => { navigation.effects.push(effect); },
  useState: () => [navigation.target, (href: string) => { navigation.target = href; navigation.calls.push(`target:${href}`); }],
  useTransition: () => [navigation.pending, (action: () => void) => { navigation.calls.push("transition"); action(); }],
}));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ push: (href: string) => navigation.calls.push(`push:${href}`) }) }));
vi.mock("@/components/shared/app-sidebar", () => ({ AppSidebar: ({ activePathname, onNavigate }: { activePathname: string; onNavigate: (href: string) => void }) => { navigation.navigate = onNavigate; return createElement("nav", { "data-path": activePathname }); } }));
vi.mock("@/components/shared/page-header", () => ({ PageHeader: ({ title }: { title: string }) => createElement("h1", null, title) }));
vi.mock("@/components/ui/sidebar", () => ({ SidebarProvider: ({ children }: { children: ReactNode }) => children, SidebarInset: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/features/global-filters/global-filter-provider", () => ({ GlobalFilterProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/features/enterprise/glife-context-provider", () => ({ GLifeContextProvider: ({ children }: { children: ReactNode }) => children }));
import { DashboardShell } from "./dashboard-shell";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";

function renderShell() {
  const html = renderToStaticMarkup(createElement(DashboardShell, { stores: [], initialFilterState: createInitialGlobalFilterState(), nowIso: "2026-10-16T12:00:00+08:00", referenceMonth: "2026-10", children: createElement("div", null, `resolved page ${navigation.pathname}`) }));
  navigation.effects.splice(0).forEach((effect) => effect());
  return html;
}

beforeEach(() => { navigation.pathname = "/performance/kpi"; navigation.target = null; navigation.pending = false; navigation.calls = []; navigation.intent.current = false; navigation.effects = []; });
describe("shared Sidebar navigation feedback", () => {
  it("sets the target before starting the router transition", () => {
    renderShell();
    navigation.navigate!("/performance/goals");
    expect(navigation.calls).toEqual(["target:/performance/goals", "transition", "push:/performance/goals"]);
  });
  it("shows target identity and loading instead of stale page content while a response is pending", () => {
    navigation.target = "/performance/goals";
    navigation.pending = true;
    const html = renderShell();
    expect(html).toContain('data-path="/performance/goals"');
    expect(html).toContain("<h1>目标</h1>");
    expect(html).toContain("正在加载数据");
    expect(html).not.toContain("resolved page");
  });
  it("uses the committed path and content when navigation settles", () => {
    navigation.target = "/performance/goals";
    const html = renderShell();
    expect(html).toContain('data-path="/performance/kpi"');
    expect(html).toContain("resolved page");
    navigation.navigate!("/performance/kpi");
    expect(navigation.calls).toEqual([]);
  });
  it("honors A to B to A clicks even before React updates pending state", () => {
    renderShell();
    navigation.navigate!("/risk/actions");
    navigation.navigate!("/performance/kpi");
    expect(navigation.calls.filter((call) => call.startsWith("push:"))).toEqual(["push:/risk/actions", "push:/performance/kpi"]);
    navigation.pending = true;
    const pending = renderShell();
    expect(pending).toContain("<h1>KPI</h1>");
    expect(pending).toContain('data-path="/performance/kpi"');
    expect(pending).not.toContain("resolved page");
    navigation.pending = false;
    expect(renderShell()).toContain("resolved page /performance/kpi");
    navigation.calls = [];
    navigation.navigate!("/performance/kpi");
    expect(navigation.calls).toEqual([]);
  });
  it("keeps the latest target visible when multiple menus are clicked and an earlier path has committed", () => {
    renderShell();
    navigation.navigate!("/risk/actions");
    navigation.navigate!("/performance/goals");
    navigation.navigate!("/risk/events");
    navigation.pending = true;
    navigation.pathname = "/risk/actions";
    const html = renderShell();
    expect(html).toContain("<h1>事件</h1>");
    expect(html).toContain('data-path="/risk/events"');
    expect(html).not.toContain("resolved page");
    navigation.pathname = "/risk/events";
    navigation.pending = false;
    const settled = renderShell();
    expect(settled).toContain("<h1>事件</h1>");
    expect(settled).toContain('data-path="/risk/events"');
    expect(settled).toContain("resolved page /risk/events");
  });
  it("can select the same pending target repeatedly without exposing old content", () => {
    renderShell();
    navigation.navigate!("/performance/goals");
    navigation.pending = true;
    renderShell();
    navigation.navigate!("/performance/goals");
    const html = renderShell();
    expect(html).toContain("<h1>目标</h1>");
    expect(html).not.toContain("resolved page");
  });

});
