import { describe, expect, it } from "vitest";
import { getDashboardRoute, navigationGroups, routes, systemManagementNavigation } from "./navigation";

describe("persistent Dashboard route presentation", () => {
  it("uses the same route objects as Sidebar", () => {
    for (const route of [...navigationGroups, systemManagementNavigation].flatMap((group) => group.items)) {
      expect(getDashboardRoute(route.href)).toBe(route);
    }
  });

  it("uses the formal Dashboard header and theme controls on both dev pages", () => {
    for (const route of [routes.devUi, routes.devDataLogic]) {
      expect(getDashboardRoute(route.href)).toBe(route);
      expect(getDashboardRoute(route.href)?.showDashboardHeader).not.toBe(false);
      expect(route.showGlobalFilters).toBe(false);
      expect(route.showPeriodFilter).toBe(false);
    }
    expect(routes.devUi.title).toBe("组件预览");
    expect(getDashboardRoute("/dev/data-logic")).toBe(routes.devDataLogic);
    expect(routes.devDataLogic.showGlobalFilters).toBe(false);
    expect(getDashboardRoute("/performance/kpi")).toBe(routes.performanceKpi);
    expect(getDashboardRoute("/unknown")).toBeUndefined();
  });

  it("hides Global Period only on pages whose data is period-independent", () => {
    for (const route of [routes.overview, routes.riskCertificates, routes.riskEnvironment, routes.stores]) {
      expect(getDashboardRoute(route.href)?.showPeriodFilter).toBe(false);
    }
    for (const route of [routes.performanceKpi, routes.performanceGoals, routes.riskEvents, routes.riskActions]) {
      expect(getDashboardRoute(route.href)?.showPeriodFilter).toBeUndefined();
    }
  });
});
