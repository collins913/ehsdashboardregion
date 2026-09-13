import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import type { TakeChargeGoalsSummary } from "@/data/contracts/take-charge";
import { SummaryCards } from "@/features/goals/goals-page-content";

const context: KpiFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

function summary(closeRate: number | null): TakeChargeGoalsSummary {
  return {
    period: {
      availability: closeRate === null ? "CONFIRMED_EMPTY" : "AVAILABLE",
      period: context.period,
      submissionTotal: closeRate === null ? 0 : 48,
      closedCount: closeRate === null ? 0 : 24,
      closeRate: {
        value: closeRate,
        result:
          closeRate === null
            ? "UNDETERMINED"
            : closeRate >= 90
              ? "ACHIEVED"
              : "NOT_ACHIEVED",
      },
    },
    annual: {
      availability: "AVAILABLE",
      currentYear: 2026,
      averageSubmissionsYtd: { value: 5.5, result: "ACHIEVED" },
      participationRateYtd: { value: 58.7, result: "ACHIEVED" },
    },
  };
}

describe("Goals summary cards", () => {
  it("renders all four values as matching plain-text metrics", () => {
    const markup = renderToStaticMarkup(
      createElement(SummaryCards, { summary: summary(50), context }),
    );

    expect(markup).toContain(">48<");
    expect(markup).toContain(">50%<");
    expect(markup).toContain(">5.5<");
    expect(markup).toContain(">59%<");
    expect(markup.match(/text-2xl font-semibold tabular-nums/g)).toHaveLength(4);
    expect(markup).not.toContain('data-slot="badge"');
  });

  it("renders an empty close rate as plain text", () => {
    const markup = renderToStaticMarkup(
      createElement(SummaryCards, { summary: summary(null), context }),
    );

    expect(markup).toContain(">无<");
    expect(markup).not.toContain('data-slot="badge"');
  });
});
