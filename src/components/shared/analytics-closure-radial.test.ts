import { describe, expect, it } from "vitest";
import { closureArcSweepDegrees, closureRadialSegments, closureRateArcValue } from "./analytics-closure-radial";

describe("AnalyticsClosureRadial geometry", () => {
  it.each([
    [0, 0],
    [33, 59.4],
    [50, 90],
    [100, 180],
  ])("maps %i percent to the same share of the half-circle", (rate, degrees) => {
    expect(closureRateArcValue(rate)).toBe(rate);
    expect(closureArcSweepDegrees(rate)).toBeCloseTo(degrees);
    expect(closureArcSweepDegrees(rate) / 180).toBeCloseTo(rate / 100);
    expect(closureRadialSegments(rate).closedValue).toBe(rate);
    expect(closureRadialSegments(rate).otherValue).toBe(100 - rate);
    expect(closureRadialSegments(rate).closedValue + closureRadialSegments(rate).otherValue).toBe(100);
  });

  it("shows no foreground arc for unknown values and bounds malformed presentation values", () => {
    expect(closureRateArcValue(null)).toBe(0);
    expect(closureArcSweepDegrees(null)).toBe(0);
    expect(closureRadialSegments(null)).toEqual({ closedValue: 0, otherValue: 100 });
    expect(closureRateArcValue(-1)).toBe(0);
    expect(closureRateArcValue(101)).toBe(100);
    expect(closureRateArcValue(Number.NaN)).toBe(0);
  });
});
