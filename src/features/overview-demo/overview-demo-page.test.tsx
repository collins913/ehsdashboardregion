import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockStores } from "@/data/mock/stores";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";
import { Sheet } from "@/components/ui/sheet";
import { ManagementSummary } from "./components/management-summary";
import { overviewDemoMonthlyHistoryPeriods } from "@/data/mock/overview-demo/overview-demo-history";
import { createOverviewDemoOutcomes } from "@/data/mock/overview-demo/overview-demo-data";
import { routes } from "@/config/navigation";
import { IssueSheet, ScopeSheet } from "./components/scope-detail-sheet";
import { attentionDirectionLabelPositions, selectOverviewDemoAttentionPoint } from "./components/overview-demo-charts";
import { OverviewDemoContent } from "./overview-demo-page";
import { buildOverviewDemoAttentionDomains, buildOverviewDemoPrimaryScoreLoss, buildOverviewDemoScopeChanges, buildOverviewDemoViewModel } from "./overview-demo-view-model";
import type { OverviewDemoScopeComparison } from "./model/overview-demo-types";

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
    expect(routes.devOverview).toMatchObject({ title: "总览 Demo", description: "EHS 管理表现与洞察" });
    expect(markup).toContain("实验版");
    expect(markup).toContain("改善最多");
    expect(markup).toContain("退步最多");
    expect(markup).toContain("系统性问题");
    expect(markup.match(/data-change-track/g)).toHaveLength(2);
    expect(markup).not.toContain('data-testid="executive-note"');
    expect(markup).not.toContain("改善最明显");
    expect(markup).toContain('data-testid="attention-matrix"');
    expect(markup).toContain('data-testid="what-changed"');
    expect(markup).toContain('data-detail-trigger="scope"');
    expect(markup).toContain("管理关注矩阵");
    expect(markup).toContain("本期变化");
    expect(markup).toContain("维度诊断");
    expect(markup).toContain("问题洞察");
    expect(markup).toContain("管理事实");
    expect(markup).not.toContain("Management Attention");
    expect(markup).not.toContain("What Changed");
    expect(markup).not.toContain("Dimension Diagnosis");
    expect(markup).not.toContain("Issue Intelligence");
    expect(markup).not.toContain("Management Facts");
    expect(markup).toContain("TCH");
  });

  it("uses structured monthly Hero data and keeps the readout outside the line plot", () => {
    const heroMarkup = renderToStaticMarkup(createElement(ManagementSummary, { hero: viewModel.hero, movements: viewModel.movements, issues: viewModel.issues, onSelectIssue: () => {} }));
    expect(heroMarkup).toContain("过去 12 个月趋势");
    expect(heroMarkup).toContain("改善最多");
    expect(heroMarkup).toContain("退步最多");
    expect(heroMarkup).toContain("主要失分");
    expect(heroMarkup).toContain("系统性问题");
    expect(heroMarkup).not.toContain("优先关注范围");
    expect(heroMarkup).not.toContain("数据完整度");
    expect(heroMarkup).not.toContain("覆盖");
    expect(heroMarkup).not.toContain("四期");
    expect(viewModel.hero.monthlyScoreHistory).toHaveLength(12);
    expect(overviewDemoMonthlyHistoryPeriods.map((item) => item.periodLabel)).toEqual([
      "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
    ]);
    expect(viewModel.hero.monthlyScoreHistory.at(-1)?.score).toBe(viewModel.hero.overallScore);
    expect(viewModel.hero.monthlyDelta).toBe(viewModel.hero.overallScore! - viewModel.hero.monthlyScoreHistory.at(-2)!.score!);
    expect(viewModel.hero.topImprovingArea?.delta).toBeGreaterThan(0);
    expect(viewModel.hero.topImprovingStore?.delta).toBeGreaterThan(0);
    expect(viewModel.hero.topDecliningArea?.delta).toBeLessThan(0);
    expect(viewModel.hero.topDecliningStore?.delta).toBeLessThan(0);
    expect(viewModel.hero.systemicIssue?.affectedStores).toBeGreaterThan(0);
    expect(markup).toContain('data-testid="overview-data-footer"');
    const charts = readFileSync("src/features/overview-demo/components/overview-demo-charts.tsx", "utf8");
    expect(charts.slice(charts.indexOf("export function OverviewDemoMonthlyTrendChart"), charts.indexOf("export function OverviewDemoAttentionChart"))).not.toContain("<Tooltip");
  });

  it("counts current FAIL stores for primary loss, excluding MISSING", () => {
    const stores = [
      { storeId: "a", outcomes: createOverviewDemoOutcomes(["actions"], ["certificateSafeDriving"]), operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 } },
      { storeId: "b", outcomes: createOverviewDemoOutcomes(["actions"], ["certificateSafeDriving"]), operationalFacts: { openActions: 0, openEvents: 0, submissionTotal: 0 } },
    ];
    expect(buildOverviewDemoPrimaryScoreLoss(stores)).toEqual({ label: "Action KPI 未达成", affectedStores: 2 });
  });

  it("renders a full-width matrix without the duplicate priority list", () => {
    expect(markup).not.toContain('data-testid="priority-scope-list"');
    expect(markup).toContain(`同级平均分 ${viewModel.attentionMatrix.averageScore}`);
    expect(markup).toContain("较上期持平");
    expect(markup).not.toContain("Y：下降 → 改善");
    expect(markup).not.toContain("X：低分 → 高分");
    expect(viewModel.attentionMatrix.points).toHaveLength(viewModel.comparisons.length);
  });

  it("positions four muted direction hints from live plot bounds while retaining average and zero references", () => {
    expect(attentionDirectionLabelPositions({ x: 52, y: 28, width: 320, height: 240 })).toEqual({
      low: { x: 60, y: 148 },
      high: { x: 364, y: 148 },
      improving: { x: 212, y: 40 },
      declining: { x: 212, y: 260 },
    });
    expect(attentionDirectionLabelPositions({ x: 80, y: 30, width: 800, height: 400 }).high).toEqual({ x: 872, y: 230 });
    const chart = readFileSync("src/features/overview-demo/components/overview-demo-charts.tsx", "utf8");
    for (const label of ["低分区", "高分区", "进步区", "退步区"]) expect(chart).toContain(label);
    expect(chart).toContain("const plot = usePlotArea()");
    expect(chart).toContain('pointerEvents="none"');
    expect(chart).toContain("<ReferenceLine x={averageScore}");
    expect(chart).toContain("<ReferenceLine y={0}");
  });

  it("builds padded matrix domains from visible points and clamps scores", () => {
    const domains = buildOverviewDemoAttentionDomains([
      { score: 57, delta: -22 },
      { score: 88, delta: 21 },
    ]);
    expect(domains.xDomain).toEqual([49, 96]);
    expect(domains.yDomain[0]).toBeLessThanOrEqual(-22);
    expect(domains.yDomain[1]).toBeGreaterThanOrEqual(21);
    expect(domains.yDomain[0]).toBeLessThanOrEqual(0);
    expect(domains.yDomain[1]).toBeGreaterThanOrEqual(0);
    expect(buildOverviewDemoAttentionDomains([{ score: 3, delta: 1 }, { score: 99, delta: 2 }]).xDomain).toEqual([0, 100]);
  });

  it("keeps matrix point selection wired to scope detail", () => {
    const selected: string[] = [];
    selectOverviewDemoAttentionPoint({ payload: { id: viewModel.attentionMatrix.points[0].id } }, (id) => selected.push(id));
    expect(selected).toEqual([viewModel.attentionMatrix.points[0].id]);
    expect(viewModel.scopeDetails.some((detail) => detail.id === selected[0])).toBe(true);
  });

  it("keeps Environment visible as TBD", () => {
    expect(markup).toContain("Environment");
    expect(markup).toContain("TBD");
  });

  it("renders affected issue counts and issue triggers", () => {
    expect(markup).toMatch(/\d+<\/strong><span[^>]*>家门店/);
    expect(markup).toContain('data-detail-trigger="issue"');
  });

  it("uses one explicit demo period across the page", () => {
    expect(markup).toContain("Demo 周期：Q2 2026");
    expect(markup).toContain("全局周期尚未映射");
    expect(markup).toContain("对比 Q1 2026");
  });

  it("acknowledges changed Global Period without mislabeling demo data", () => {
    const yearState = { ...createInitialGlobalFilterState(), period: { mode: "THIS_YEAR" as const } };
    const yearViewModel = buildOverviewDemoViewModel(canonicalStores, yearState);
    expect(yearViewModel.periodNotice).toContain("全局周期“本年”尚未映射");
    expect(yearViewModel.currentPeriodLabel).toBe("Q2 2026");
    expect(yearViewModel.previousPeriodLabel).toBe("Q1 2026");
  });

  it("merges priority and dimension sections into one structured diagnosis", () => {
    const detail = viewModel.scopeDetails.find((item) => item.level === "AREA")!;
    const detailMarkup = renderToStaticMarkup(createElement(Sheet, { open: true }, createElement(ScopeSheet, { detail })));
    expect(detailMarkup).toContain("过去 12 个月趋势");
    expect(detailMarkup).toContain("重点诊断");
    expect(detailMarkup).not.toContain("优先核查");
    expect(detailMarkup).not.toContain("维度诊断");
    expect(detailMarkup).toContain("本期变化");
    expect(detailMarkup).toContain("综合得分");
    expect(detailMarkup).toContain("Environment");
    expect(detailMarkup).toContain("评分方式待定义");
    expect(detailMarkup).toContain('data-testid="management-facts"');
    expect(detailMarkup).not.toContain('data-testid="business-ctas"');
    expect(detailMarkup).not.toContain("当前仍有");
    expect(detail.monthlyHistory).toHaveLength(12);
    expect(detail.diagnostics.some((dimension) => dimension.issues.some((issue) => issue.newCount > 0 || issue.persistentCount > 0))).toBe(true);
    expect(detail.diagnostics.some((dimension) => dimension.issues.some((issue) => issue.isDeclineDriver))).toBe(true);
    expect(detail.diagnostics.some((dimension) => dimension.issues.some((issue) => issue.affectedStores > 0))).toBe(true);
    expect(detail.diagnostics.some((dimension) => dimension.issues.some((issue) => issue.categoryLabel && issue.status && issue.scoreImpact !== null))).toBe(true);
  });

  it("sorts and limits structured scope changes deterministically", () => {
    const comparisons = Array.from({ length: 14 }, (_, index) => ({
      id: `scope-${String(index).padStart(2, "0")}`,
      rank: index + 1,
      label: `门店 ${index}`,
      level: "STORE" as const,
      score: 80 - index,
      previousScore: 80,
      delta: index < 7 ? -(index + 1) : index - 6,
      completeness: 100,
      storeCount: 1,
      mainChange: "结构化变化",
      currentConcern: "结构化关注",
    })) satisfies OverviewDemoScopeComparison[];
    const changes = buildOverviewDemoScopeChanges(comparisons, "门店变化");
    expect(changes.declining).toHaveLength(5);
    expect(changes.improving).toHaveLength(5);
    expect(changes.declining.map((item) => item.delta)).toEqual([-7, -6, -5, -4, -3]);
    expect(changes.improving.map((item) => item.delta)).toEqual([7, 6, 5, 4, 3]);
    const tied = buildOverviewDemoScopeChanges([
      { ...comparisons[0], id: "b", delta: -3 },
      { ...comparisons[0], id: "a", delta: -3 },
    ], "门店变化");
    expect(tied.declining.map((item) => item.scopeId)).toEqual(["a", "b"]);
  });

  it("shows child changes for an Area and hides them for a Store", () => {
    const areaDetail = viewModel.scopeDetails.find((detail) => detail.level === "AREA")!;
    const storeDetail = viewModel.scopeDetails.find((detail) => detail.level === "STORE")!;
    expect(areaDetail.scopeChanges?.label).toBe("门店变化");
    expect(storeDetail.scopeChanges).toBeNull();
    expect(areaDetail.scopeChanges!.declining.length).toBeLessThanOrEqual(5);
    expect(areaDetail.scopeChanges!.improving.length).toBeLessThanOrEqual(5);
  });

  it("places area distribution before the complete store explorer", () => {
    const issueMarkup = renderToStaticMarkup(createElement(Sheet, { open: true }, createElement(IssueSheet, { issue: viewModel.issues[0] })));
    expect(issueMarkup.indexOf("小区分布")).toBeLessThan(issueMarkup.indexOf("受影响门店"));
    expect(issueMarkup.indexOf("问题变化")).toBeLessThan(issueMarkup.indexOf("受影响门店"));
    expect(issueMarkup.indexOf("结论")).toBeLessThan(issueMarkup.indexOf("受影响门店"));
    expect(issueMarkup).toContain("集中度");
    expect(issueMarkup).toContain("持续率");
    expect(issueMarkup).toContain("搜索门店、TRTID 或小区");
    expect(issueMarkup).toContain("当前 = 新增 + 持续；上期 = 持续 + 已恢复。");
  });

  it("preserves existing score, rank, lifecycle and Environment semantics", () => {
    expect(viewModel.scopeDetails[0].benchmark.rank).not.toBeNull();
    expect(viewModel.scopeDetails[0].benchmark.parentAverage).not.toBeNull();
    expect(viewModel.scopeDetails[0].monthlyHistory).toHaveLength(12);
    expect(viewModel.scopeDetails[0].score).toBe(viewModel.comparisons.find((item) => item.id === viewModel.scopeDetails[0].id)?.score);
    expect(viewModel.scopeDetails[0].diagnostics.find((item) => item.dimensionKey === "ENVIRONMENT")?.score).toBeNull();
    for (const issue of viewModel.scopeDetails[0].issues) expect(issue.lifecycle.current).toBe(issue.lifecycle.new + issue.lifecycle.persistent);
  });

  it("keeps all Area-level stores in the matrix while limiting visible labels", () => {
    const manyStores = Array.from({ length: 80 }, (_, index) => ({ storeId: `AREA-${index + 1}`, displayName: `门店 ${index + 1}`, region: "北区", area: "北辰一部" }));
    const state = { ...createInitialGlobalFilterState(), area: { kind: "INCLUDE" as const, values: ["北辰一部"] as [string, ...string[]] } };
    const areaViewModel = buildOverviewDemoViewModel(manyStores, state);
    expect(areaViewModel.attentionMatrix.points).toHaveLength(80);
    expect(areaViewModel.attentionMatrix.points.filter((point) => point.labelVisible).length).toBeLessThanOrEqual(5);
  });
});
