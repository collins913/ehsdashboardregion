import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EnvironmentDataTable, EnvironmentDetailContent, EnvironmentValue } from "./environment-data-table";
import { buildEnvironmentDetail, ENVIRONMENT_ITEMS, environmentQueryKey } from "./environment-view-model";
import { loadEnvironmentPageData } from "./environment-page-content";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";

const record: NormalizedEnvironmentRecord = {
  storeId: "canonical-not-trtid", storeDisplayName: "中文门店",
  environmentalImpactAssessment: "有", dischargePermit: "无", drainagePermit: "不适用",
  emergencyPlan: "有", monitoring: "无", wasteContract: "不适用",
};
const context: EhsFilterContext = {
  region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

describe("Environment feature", () => {
  it.each(["有", "无", "不适用"] as const)("renders %s with the same neutral Badge", (value) => {
    const markup = renderToStaticMarkup(createElement(EnvironmentValue, { value }));
    expect(markup).toContain(value);
    expect(markup).toContain('data-variant="outline"');
    expect(markup).not.toMatch(/正常|异常|OPEN|CLOSED/);
  });
  it.each(ENVIRONMENT_ITEMS)("creates only the three defined detail fields for $label", ({ key, label }) => {
    const detail = buildEnvironmentDetail(record, key);
    expect(detail).toEqual({ storeDisplayName: "中文门店", itemName: label, value: record[key] });
    const markup = renderToStaticMarkup(createElement(EnvironmentDetailContent, { detail }));
    expect(markup).toContain(label);
    expect(markup).toContain("详情字段待定义");
    expect(markup).not.toMatch(/日期|证号|机构|备注|评分|TRTID/);
    expect((markup.match(/<dt /g) ?? []).length).toBe(3);
  });
  it("reuses seven sortable headers, visibility and the unmeasured adaptive row", () => {
    const markup = renderToStaticMarkup(createElement(EnvironmentDataTable, { rows: [record], queryKey: "scope", queryStatus: "READY" }));
    for (const label of ["门店", ...ENVIRONMENT_ITEMS.map((item) => item.label)]) expect(markup).toContain(`${label}: 未排序`);
    expect(markup).toContain("列显示");
    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).toContain("table-fixed");
  });
  it("uses the server query envelope without loading Mock in UI", async () => {
    const query = vi.fn(async () => ({ availability: "AVAILABLE" as const, items: [record] as const }));
    await loadEnvironmentPageData(context, "reference", query);
    expect(query).toHaveBeenCalledWith({ referenceDateIso: "reference", query: context });
    query.mockClear();
    expect(await loadEnvironmentPageData(null, "reference", query)).toBeNull();
    expect(query).not.toHaveBeenCalled();
    for (const file of ["environment-page-content.tsx", "environment-data-table.tsx", "environment-view-model.ts"]) {
      expect(readFileSync(`src/features/environment/${file}`, "utf8")).not.toMatch(/@\/data\/mock|createMockEhsRepository|@\/data\/server/);
    }
  });
  it("does not change query identity on Period change but does on Store change", () => {
    const otherPeriod = { ...context, period: periodFromMonthRange("2030-01", "2030-02")! };
    expect(environmentQueryKey(otherPeriod)).toBe(environmentQueryKey(context));
    expect(environmentQueryKey({ ...context, store: { kind: "INCLUDE", values: [record.storeId] } })).not.toBe(environmentQueryKey(context));
  });
  it("routes through the persistent shell and wires all six cell triggers", () => {
    const table = readFileSync("src/features/environment/environment-data-table.tsx", "utf8");
    expect(table).toContain("...ENVIRONMENT_ITEMS.map");
    expect(table).toContain("<TableCellTrigger");
    expect(table).toContain("openDetail(row.original, key)");
    expect(table).toContain("stickyStoreCellClassName");
    const route = readFileSync("src/app/(dashboard)/risk/environment/page.tsx", "utf8");
    expect(route).toContain("queryEnvironment={queryEnvironment}");
    expect(route).not.toMatch(/PageHeader|GlobalFilters|PlaceholderPage/);
  });
  it("has no success-only availability banner and uses the scope-aware shared loading presentation", () => {
    const page = readFileSync("src/features/environment/environment-page-content.tsx", "utf8");
    expect(page).not.toMatch(/DataAvailabilityDisplay|数据不完整/);
    expect(page).toContain("useLatestAsyncQuery(queryKey");
    expect(page).toContain("state.resolved?.data");
    const table = readFileSync("src/features/environment/environment-data-table.tsx", "utf8");
    expect(table).toContain("useResolvedDataTableSnapshot");
    expect(table).toContain("useRetainedDataTableRows");
    expect(table).toContain("pendingMode={pendingMode}");
    expect(table).toContain('pendingMode === "mask-content"');
    expect(table).not.toMatch(/setAdaptivePagination\(null\)|key=\{queryKey\}/);
  });
});
