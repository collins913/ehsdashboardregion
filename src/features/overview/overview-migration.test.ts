import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const formalRoute = readFileSync("src/app/(dashboard)/overview/page.tsx", "utf8");
const devRoute = readFileSync("src/app/(dashboard)/dev/overview/page.tsx", "utf8");
const feature = readFileSync("src/features/overview/overview-page.tsx", "utf8");
const serverQuery = readFileSync("src/data/server/ehs-query-actions.ts", "utf8");

describe("formal Overview migration boundary", () => {
  it("renders the formal feature instead of the placeholder and keeps Global Filters", () => {
    expect(formalRoute).toContain("@/features/overview/overview-page");
    expect(formalRoute).toContain("queryOverview");
    expect(formalRoute).not.toContain("PlaceholderPage");
    expect(feature).toContain("useGlobalFilters");
    expect(feature).toContain("filterContext");
  });

  it("keeps formal scoring behind the authorized domain contribution boundary", () => {
    expect(feature).toContain("OverviewQueryAction");
    expect(feature).not.toContain("@/features/overview-demo");
    expect(feature).not.toContain("@/data/prototype");
    expect(serverQuery).toContain("queryOverview");
    expect(feature).not.toContain("scoreStores(");
    expect(feature).not.toContain("buildPrototypeOverviewResult(");
    expect(serverQuery).toContain("authorizeBusinessScope(query.context)");
    expect(serverQuery).toContain("getOverviewScoreData");
    expect(serverQuery).toContain("prepareOverviewResult");
  });

  it("makes the guarded dev route reuse the formal feature and keeps business navigation formal", () => {
    expect(devRoute).toContain("@/features/overview/overview-page");
    expect(devRoute).toContain("queryOverview");
    expect(devRoute).not.toContain("@/features/overview-demo");
    expect(feature).not.toContain('href="/dev/');
  });
});
