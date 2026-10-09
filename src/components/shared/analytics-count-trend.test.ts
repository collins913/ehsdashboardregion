import { describe, expect, it } from "vitest";
import { analyticsCountTrendScale, type AnalyticsCountTrendRow } from "./analytics-count-trend";

describe("AnalyticsCountTrend scale", () => {
  it.each([
    [[], { domain: [0, 1], ticks: [0, 1] }],
    [[{ month: "2026-01", count: 0 }], { domain: [0, 1], ticks: [0, 1] }],
    [[{ month: "2026-01", count: 8 }], { domain: [0, 9], ticks: [0, 3, 6, 9] }],
    [[{ month: "2026-01", count: 0 }, { month: "2026-03", count: 20 }], { domain: [0, 24], ticks: [0, 6, 12, 18, 24] }],
    [[{ month: "2026-01", count: 1_000_000_000 }], { domain: [0, 1_050_000_000], ticks: [0, 262_500_000, 525_000_000, 787_500_000, 1_050_000_000] }],
  ] as const)("keeps the baseline at zero with integer ticks for %j", (data, expected) => {
    expect(analyticsCountTrendScale(data as readonly AnalyticsCountTrendRow[])).toEqual(expected);
  });

  it("ignores non-finite values when choosing the visible upper bound", () => {
    expect(analyticsCountTrendScale([
      { month: "2026-01", count: Number.NaN },
      { month: "2026-02", count: 4 },
    ])).toEqual({ domain: [0, 6], ticks: [0, 2, 4, 6] });
  });

  it("keeps invalid negative counts from moving the count axis below zero", () => {
    expect(analyticsCountTrendScale([
      { month: "2026-01", count: -7 },
      { month: "2026-02", count: 3 },
    ]).domain[0]).toBe(0);
  });
});
