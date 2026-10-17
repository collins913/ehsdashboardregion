import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { TakeChargeGoalsSummary } from "@/data/contracts/take-charge";
import {
  SummaryCards,
  SummaryCardsPlaceholder,
} from "@/features/goals/goals-page-content";

const context: EhsFilterContext = {
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
        reason: closeRate !== null && closeRate >= 90 ? "ACHIEVED" : "RULE_NOT_MET",
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
      submissionsPerCapitaYtd: { value: 5.5, result: "ACHIEVED", reason: "ACHIEVED" },
      participationRateYtd: { value: 58.7, result: "ACHIEVED", reason: "ACHIEVED" },
    },
  };
}

describe("Goals summary cards", () => {
  it("keeps four card slots while the summary query is loading", () => {
    const markup = renderToStaticMarkup(
      createElement(SummaryCardsPlaceholder, { context }),
    );

    expect(markup.match(/data-slot="card"/g)).toHaveLength(4);
    expect(markup.match(/data-slot="skeleton"/g)).toHaveLength(4);
    expect(markup).toContain("提交总数");
    expect(markup).toContain("今年参与率");
  });

  it("renders all four values as matching plain-text metrics", () => {
    const markup = renderToStaticMarkup(
      createElement(SummaryCards, { summary: summary(50) }),
    );

    expect(markup).toContain(">48<");
    expect(markup).toContain(">50%<");
    expect(markup).toContain(">5.5<");
    expect(markup).toContain(">58.7%<");
    expect(markup.match(/text-2xl font-semibold tabular-nums/g)).toHaveLength(4);
    expect(markup).not.toContain('data-slot="badge"');
  });

  it("does not round below-target source values into the target", () => {
    const input = summary(89.999);
    input.annual.submissionsPerCapitaYtd = { value: 3.999, result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" };
    input.annual.participationRateYtd = { value: 49.999, result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" };
    const markup = renderToStaticMarkup(createElement(SummaryCards, { summary: input }));
    expect(markup).toContain(">89.99%<");
    expect(markup).toContain(">3.99<");
    expect(markup).toContain(">49.99%<");
    expect(input.period.closeRate.value).toBe(89.999);
    expect(markup.match(/data-slot="card"/g)).toHaveLength(4);
    expect(markup).not.toContain('data-slot="badge"');
  });

  it("renders an empty close rate as plain text", () => {
    const markup = renderToStaticMarkup(
      createElement(SummaryCards, { summary: summary(null) }),
    );

    expect(markup).toContain(">-<");
    expect(markup).not.toContain('data-slot="badge"');
  });
});
