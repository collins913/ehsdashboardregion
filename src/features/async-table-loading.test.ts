import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("async table loading architecture", () => {
  it.each([
    ["Actions", "./actions/actions-page-content.tsx"],
    ["Events", "./events/events-page-content.tsx"],
    ["Goals", "./goals/goals-page-content.tsx"],
  ])("does not remount the %s table for a Filter Context change", (_, path) => {
    expect(source(path)).not.toContain("key={JSON.stringify(filterContext)}");
  });

  it.each([
    ["Actions", "./actions/actions-data-table.tsx"],
    ["Events", "./events/events-data-table.tsx"],
    ["Take Charge", "./goals/take-charge-data-table.tsx"],
    ["KPI", "./kpi/kpi-data-table.tsx"],
    ["Stores", "./stores/stores-data-table.tsx"],
  ])("uses full-column loading slots in the %s table", (_, path) => {
    const tableSource = source(path);

    expect(tableSource).toContain("<DataTablePlaceholderRows");
    expect(tableSource).toContain("useRetainedDataTableRows");
    expect(tableSource).toContain("<DataTableLoadingCellContent");
    expect(tableSource).not.toMatch(/h-24[\s\S]{0,160}正在加载/);
  });

  it.each([
    ["Actions", "./actions/actions-data-table.tsx"],
    ["Events", "./events/events-data-table.tsx"],
    ["Take Charge", "./goals/take-charge-data-table.tsx"],
    ["Stores", "./stores/stores-data-table.tsx"],
  ])("retains resolved rows and isolates pending metadata in %s", (_, path) => {
    const tableSource = source(path);

    expect(tableSource).toContain("useResolvedDataTableSnapshot");
    expect(tableSource).toContain("DataTablePendingValue");
    expect(tableSource).not.toMatch(/totalCount\s*=\s*currentResult\?\.totalCount/);
  });

  it("keeps KPI client-side pagination independent from repository snapshots", () => {
    const tableSource = source("./kpi/kpi-data-table.tsx");

    expect(tableSource).not.toContain("useResolvedDataTableSnapshot");
    expect(tableSource).not.toContain("DataTablePendingValue");
  });

  it.each([
    ["Actions", "./actions/actions-data-table.tsx"],
    ["Events", "./events/events-data-table.tsx"],
    ["Take Charge", "./goals/take-charge-data-table.tsx"],
  ])("wires scope-aware pending mode and resolved sorting in %s", (_, path) => {
    const tableSource = source(path);
    expect(tableSource).toContain("pendingMode={pendingMode}");
    expect(tableSource).toContain('pendingMode === "mask-content"');
    expect(tableSource).toContain("resolvedSorting: sorting");
    expect(tableSource).toContain("sorting: result?.resolvedSorting ?? sorting");
    expect(tableSource).toContain("manualPagination: true");
    expect(tableSource).toContain("manualSorting: true");
  });

  it.each([
    ["Actions", "./actions/actions-data-table.tsx"],
    ["Events", "./events/events-data-table.tsx"],
    ["Take Charge", "./goals/take-charge-data-table.tsx"],
  ])("resets the %s page for a new query scope", (_, path) => {
    const tableSource = source(path);

    expect(tableSource).toContain("queryScopeKey");
    expect(tableSource).toContain("pageIndex: 0");
  });

  it.each([
    ["KPI", "./kpi/kpi-page-content.tsx", "KpiDataTable"],
    ["Stores", "./stores/stores-page-content.tsx", "StoresDataTable"],
  ])("keeps the %s table mounted while its query state changes", (_, path, tableName) => {
    const pageSource = source(path);

    expect(pageSource).toContain(`<${tableName}`);
    expect(pageSource).toContain("queryStatus=");
    expect(pageSource).not.toMatch(
      /state\.status === "LOADING" \|\| state\.status === "ERROR" \? \(/,
    );
  });

  it("loads Take Charge summary and records in independent mounted regions", () => {
    const pageSource = source("./goals/goals-page-content.tsx");

    expect(pageSource).toContain("<SummaryCardsPlaceholder");
    expect(pageSource).toContain("<TakeChargeDataTable");
  });
});
