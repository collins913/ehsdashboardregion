import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ActionsCell,
  KPI_COLUMN_SIZE_ROLES,
  KpiDataTable,
} from "@/features/kpi/kpi-data-table";
import type { ActionKpiValue, KpiRow } from "@/features/kpi/types";

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

describe("KPI Actions cell", () => {
  it("renders a confirmed no-actions result as a clickable secondary status value", () => {
    const markup = renderActions({
      availability: "CONFIRMED_EMPTY",
      value: null,
      result: "ACHIEVED",
      openActions: { availability: "CONFIRMED_EMPTY", items: [] },
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
        openActions: { availability, items: [] },
      });

      expect(markup).toContain(
        availability === "INCOMPLETE" ? "数据不完整" : "数据不可用",
      );
      expect(markup).not.toContain("关闭率 无");
    },
  );
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
              openActions: { availability: "CONFIRMED_EMPTY", items: [] },
            }),
          ],
        }),
      ),
    );

    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).not.toContain("测试门店");
  });
});
