import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("persistent Dashboard composition", () => {
  it("owns Header inside the existing GlobalFilterProvider", () => {
    const shell = readFileSync("src/components/shared/dashboard-shell.tsx", "utf8");
    expect(shell).toContain("getDashboardRoute(usePathname())");
    expect(shell.indexOf("<PageHeader")).toBeGreaterThan(shell.indexOf("<GlobalFilterProvider"));
    expect(shell).not.toMatch(/<PageHeader[^>]*key=/);
  });

  it("business pages no longer own Header composition", () => {
    for (const route of ["performance/kpi", "performance/goals", "risk/actions", "risk/events", "stores"]) {
      expect(readFileSync(`src/app/(dashboard)/${route}/page.tsx`, "utf8")).not.toContain("PageHeader");
    }
    expect(readFileSync("src/components/shared/placeholder-page.tsx", "utf8")).not.toContain("PageHeader");
  });
});
