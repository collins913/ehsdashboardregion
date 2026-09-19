import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockStores } from "@/data/mock/stores";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";
import { Sheet } from "@/components/ui/sheet";
import { IssueSheet, ScopeSheet } from "./components/scope-detail-sheet";
import { OverviewDemoContent } from "./overview-demo-page";
import { buildOverviewDemoViewModel } from "./overview-demo-view-model";

const canonicalStores = mockStores.map((store) => ({
  storeId: store.trtid,
  displayName: store.storeNameCn,
  region: store.region,
  area: store.area,
}));

describe("Overview Demo UI", () => {
  const viewModel = buildOverviewDemoViewModel(canonicalStores, createInitialGlobalFilterState());
  const markup = renderToStaticMarkup(createElement(OverviewDemoContent, { viewModel }));

  it("renders the Demo page and scope detail triggers", () => {
    expect(markup).toContain("Experimental");
    expect(markup).toContain("Priority Scope");
    expect(markup).toContain("Primary Decline Driver");
    expect(markup).not.toContain("Management narrative");
    expect(markup).toContain('data-testid="attention-matrix"');
    expect(markup).toContain('data-testid="what-changed"');
    expect(markup).toContain('data-detail-trigger="scope"');
  });

  it("keeps Environment visible as TBD", () => {
    expect(markup).toContain("Environment");
    expect(markup).toContain("TBD");
  });

  it("renders affected issue counts and issue triggers", () => {
    expect(markup).toMatch(/\d+<\/strong><span[^>]*>stores/);
    expect(markup).toContain('data-detail-trigger="issue"');
  });

  it("uses one explicit demo period across the page", () => {
    expect(markup).toContain("Demo period: Q2 2026");
    expect(markup).toContain("Global period not mapped");
    expect(markup).toContain("vs Q1 2026");
  });

  it("acknowledges changed Global Period without mislabeling demo data", () => {
    const yearState = { ...createInitialGlobalFilterState(), period: { mode: "THIS_YEAR" as const } };
    const yearViewModel = buildOverviewDemoViewModel(canonicalStores, yearState);
    expect(yearViewModel.periodNotice).toContain("全局周期“本年”未映射");
    expect(yearViewModel.currentPeriodLabel).toBe("Q2 2026");
    expect(yearViewModel.previousPeriodLabel).toBe("Q1 2026");
  });

  it("renders enhanced scope diagnosis", () => {
    const detailMarkup = renderToStaticMarkup(createElement(Sheet, { open: true }, createElement(ScopeSheet, { detail: viewModel.scopeDetails[0] })));
    expect(detailMarkup).toContain("4-period trend");
    expect(detailMarkup).toContain("Priority Investigation");
    expect(detailMarkup).toContain("What Changed");
    expect(detailMarkup).toContain("Rank");
    expect(detailMarkup).toContain("Environment");
  });

  it("places area distribution before the complete store explorer", () => {
    const issueMarkup = renderToStaticMarkup(createElement(Sheet, { open: true }, createElement(IssueSheet, { issue: viewModel.issues[0] })));
    expect(issueMarkup.indexOf("Area distribution")).toBeLessThan(issueMarkup.indexOf("Affected stores"));
    expect(issueMarkup.indexOf("Lifecycle")).toBeLessThan(issueMarkup.indexOf("Affected stores"));
    expect(issueMarkup.indexOf("Conclusion")).toBeLessThan(issueMarkup.indexOf("Affected stores"));
    expect(issueMarkup).toContain("Concentration");
    expect(issueMarkup).toContain("Persistence");
    expect(issueMarkup).toContain("搜索门店");
  });

  it("provides benchmark, rank, trend and priority data to each scope detail", () => {
    expect(viewModel.scopeDetails[0].benchmark.rank).not.toBeNull();
    expect(viewModel.scopeDetails[0].benchmark.parentAverage).not.toBeNull();
    expect(viewModel.scopeDetails[0].history).toHaveLength(4);
    expect(viewModel.scopeDetails[0].priorityInvestigations.length).toBeGreaterThan(0);
  });

  it("keeps all Area-level stores in the matrix while limiting visible labels", () => {
    const manyStores = Array.from({ length: 80 }, (_, index) => ({ storeId: `AREA-${index + 1}`, displayName: `门店 ${index + 1}`, region: "北区", area: "北辰一部" }));
    const state = { ...createInitialGlobalFilterState(), area: { kind: "INCLUDE" as const, values: ["北辰一部"] as [string, ...string[]] } };
    const areaViewModel = buildOverviewDemoViewModel(manyStores, state);
    expect(areaViewModel.attentionMatrix.points).toHaveLength(80);
    expect(areaViewModel.attentionMatrix.points.filter((point) => point.labelVisible).length).toBeLessThanOrEqual(5);
  });
});
