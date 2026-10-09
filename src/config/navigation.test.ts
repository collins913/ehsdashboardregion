import { describe, expect, it } from "vitest";
import { getDashboardRoute, navigationGroups, routes } from "./navigation";

describe("persistent Dashboard route presentation", () => {
  it("uses the same route objects as Sidebar", () => {
    for (const route of navigationGroups.flatMap((group) => group.items)) {
      expect(getDashboardRoute(route.href)).toBe(route);
    }
  });

  it("keeps UI Lab opt-out in centralized route metadata", () => {
    expect(getDashboardRoute("/dev/ui")?.showDashboardHeader).toBe(false);
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
