import { describe, expect, it } from "vitest";
import { buildOverviewDemoSparkline, scoreDelta, trendExtremes } from "./overview-demo-trend";
import type { OverviewDemoScopeComparison } from "./overview-demo-types";

describe("Overview Demo trend", () => {
  it("returns a positive delta", () => expect(scoreDelta(88, 80)).toBe(8));
  it("returns a negative delta", () => expect(scoreDelta(61, 70)).toBe(-9));
  it("returns zero when unchanged", () => expect(scoreDelta(75, 75)).toBe(0));
  it("builds a four-period sparkline and preserves extremes", () => {
    const points = buildOverviewDemoSparkline([
      { periodLabel: "Q3 2025", score: 70 },
      { periodLabel: "Q4 2025", score: 76 },
      { periodLabel: "Q1 2026", score: 64 },
      { periodLabel: "Q2 2026", score: 88 },
    ]).split(" ");
    expect(points).toHaveLength(4);
    expect(points[2]).toContain(",66");
    expect(points[3]).toContain(",6");
  });

  it("identifies positive and negative trend extremes", () => {
    const comparisons: OverviewDemoScopeComparison[] = [
      { id: "up", rank: 1, label: "改善", level: "AREA", score: 88, previousScore: 70, delta: 18, completeness: 100, storeCount: 2, topHint: "改善" },
      { id: "down", rank: 2, label: "下降", level: "AREA", score: 60, previousScore: 80, delta: -20, completeness: 100, storeCount: 2, topHint: "下降" },
      { id: "flat", rank: 3, label: "稳定", level: "AREA", score: 75, previousScore: 75, delta: 0, completeness: 100, storeCount: 2, topHint: "稳定" },
    ];
    expect(trendExtremes(comparisons)).toMatchObject({
      largestImprovement: { id: "up" },
      largestDecline: { id: "down" },
    });
  });
});
