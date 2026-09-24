import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ActionsCell,
  KPI_COLUMN_SIZE_ROLES,
  KpiDataTable,
} from "@/features/kpi/kpi-data-table";
import { buildKpiActionDrilldownQuery } from "@/features/kpi/kpi-action-drilldown";
import type { KpiDetailQueries } from "@/features/kpi/kpi-detail-sheet";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { ActionKpiValue, KpiRow } from "@/features/kpi/types";

const context: EhsFilterContext = {
  region: { kind: "INCLUDE", values: ["REGION-1"] },
  area: { kind: "INCLUDE", values: ["AREA-1"] },
  store: { kind: "ALL" },
  period: {
    startInclusive: "2026-07-01T00:00:00+08:00",
    endExclusive: "2026-10-01T00:00:00+08:00",
    includedMonths: ["2026-07", "2026-08", "2026-09"],
  },
};

function rowWithActions(actions: ActionKpiValue): KpiRow {
  return {
    store: {
      storeId: "STORE-1",
      displayName: "测试门店",
      region: "测试区域",
      area: "测试小区",
    },
    training: { availability: "AVAILABLE", result: "ACHIEVED" },
    drill: { availability: "AVAILABLE", result: "ACHIEVED" },
    actions,
    inspections: { availability: "AVAILABLE", result: "ACHIEVED" },
    astmEvents: { availability: "CONFIRMED_EMPTY", result: "NOT_OCCURRED" },
  };
}

function renderActions(actions: ActionKpiValue): string {
  return renderToStaticMarkup(
    createElement(
      TooltipProvider,
      null,
      createElement(ActionsCell, { value: actions, onOpen: () => {} }),
    ),
  );
}

const emptyKpiDetails: KpiDetailQueries = {
  training: async () => ({ availability: "CONFIRMED_EMPTY", items: [] }),
  drill: async () => ({ availability: "CONFIRMED_EMPTY", items: [] }),
  inspections: async () => ({ availability: "CONFIRMED_EMPTY", items: [] }),
  astmEvents: async () => ({ availability: "CONFIRMED_EMPTY", items: [] }),
};

describe("KPI Actions cell", () => {
  it("renders a confirmed no-actions result as a clickable secondary status value", () => {
    const markup = renderActions({
      availability: "CONFIRMED_EMPTY",
      value: null,
      result: "ACHIEVED",
    });

    expect(markup).toContain('aria-label="查看未关闭行动项，关闭率 无"');
    expect(markup).toContain('data-emphasis="secondary"');
    expect(markup).toContain(">无</span>");
    expect(markup).not.toContain("100%");
  });

  it.each(["INCOMPLETE", "UNAVAILABLE"] as const)(
    "renders %s availability instead of no-actions",
    (availability) => {
      const markup = renderActions({
        availability,
        value: null,
        result: "UNDETERMINED",
      });

      expect(markup).toContain(
        availability === "INCOMPLETE" ? "数据不完整" : "数据不可用",
      );
      expect(markup).not.toContain("关闭率 无");
    },
  );
});

describe("KPI Actions drill-down query", () => {
  it("reuses the current global scope and replaces only the Store selection", () => {
    expect(buildKpiActionDrilldownQuery(context, "STORE-1")).toEqual({
      context: {
        ...context,
        store: { kind: "INCLUDE", values: ["STORE-1"] },
      },
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: Number.MAX_SAFE_INTEGER,
    });
  });
});

describe("KPI adaptive table hydration", () => {
  it("uses a primary Store column and compact KPI value columns", () => {
    expect(KPI_COLUMN_SIZE_ROLES).toEqual({
      store: "primary",
      training: "compact",
      drill: "compact",
      actions: "compact",
      inspections: "compact",
      astmEvents: "compact",
    });
  });

  it("renders a measurement shell without business rows before measurement", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(KpiDataTable, {
          rows: [
            rowWithActions({
              availability: "AVAILABLE",
              value: 92,
              result: "ACHIEVED",
            }),
          ],
          context,
          referenceDateIso: "2026-09-11T00:00:00+08:00",
          queryActions: async ({ query }) => ({
            availability: "CONFIRMED_EMPTY",
            items: [],
            totalCount: 0,
            pageIndex: query.pageIndex,
            pageSize: query.pageSize,
          }),
          queryKpiDetails: emptyKpiDetails,
        }),
      ),
    );

    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).not.toContain("测试门店");
  });
});
