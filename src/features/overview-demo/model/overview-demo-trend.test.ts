import { describe, expect, it } from "vitest";
import { buildOverviewDemoSparkline, classifyOverviewDemoTrend, scoreDelta, trendExtremes } from "./overview-demo-trend";
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
      { id: "up", rank: 1, label: "改善", level: "AREA", score: 88, previousScore: 70, delta: 18, completeness: 100, storeCount: 2, mainChange: "Improved", currentConcern: "None" },
      { id: "down", rank: 2, label: "下降", level: "AREA", score: 60, previousScore: 80, delta: -20, completeness: 100, storeCount: 2, mainChange: "Declined", currentConcern: "Issue" },
      { id: "flat", rank: 3, label: "稳定", level: "AREA", score: 75, previousScore: 75, delta: 0, completeness: 100, storeCount: 2, mainChange: "Stable", currentConcern: "None" },
    ];
    expect(trendExtremes(comparisons)).toMatchObject({
      largestImprovement: { id: "up" },
      largestDecline: { id: "down" },
    });
  });

  it("classifies short trend labels deterministically", () => {
    const history = (scores: number[]) => scores.map((score, index) => ({ periodLabel: `Q${index + 1}`, score }));
    expect(classifyOverviewDemoTrend(history([60, 65, 70, 75]))).toBe("持续改善");
    expect(classifyOverviewDemoTrend(history([75, 70, 65, 60]))).toBe("持续下降");
    expect(classifyOverviewDemoTrend(history([70, 66, 66, 72]))).toBe("近期回升");
    expect(classifyOverviewDemoTrend(history([70, 73, 71, 71]))).toBe("基本稳定");
  });
});
