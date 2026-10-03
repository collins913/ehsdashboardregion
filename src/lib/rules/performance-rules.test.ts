import { describe, expect, it } from "vitest";
import {
  ACTION_CLOSURE_RATE_TARGET,
  evaluateActionClosureRate,
  evaluateDrillPerformance,
  sourceStatusCompletion,
} from "./performance-rules";

describe("Drill KPI", () => {
  it("is achieved when every included month has a completed Drill", () => {
    expect(
      evaluateDrillPerformance([
        { drillCompletion: [true] },
        { drillCompletion: [true, true] },
      ]),
    ).toBe("ACHIEVED");
  });

  it("is not achieved when an included month has zero completed Drills", () => {
    expect(
      evaluateDrillPerformance([
        { drillCompletion: [true] },
        { drillCompletion: [] },
      ]),
    ).toBe("NOT_ACHIEVED");
  });

  it("is not achieved when a month contains an incomplete Drill", () => {
    expect(
      evaluateDrillPerformance([{ drillCompletion: [true, false] }]),
    ).toBe("NOT_ACHIEVED");
  });

  it("accepts multiple completed Drills in a month", () => {
    expect(evaluateDrillPerformance([{ drillCompletion: [true, true, true] }])).toBe(
      "ACHIEVED",
    );
  });

  it("is undetermined only for an unavailable included-month set", () => {
    expect(evaluateDrillPerformance(null)).toBe("UNDETERMINED");
    expect(evaluateDrillPerformance([])).toBe("UNDETERMINED");
  });

  it("keeps open-text Status values open and only treats exact trimmed 已完成 as complete", () => {
    expect(sourceStatusCompletion("  已完成 ")).toBe(true);
    expect(sourceStatusCompletion("待复核")).toBe(false);
  });
});

describe("Actions KPI", () => {
  it("uses the confirmed 90 percent target", () => {
    expect(ACTION_CLOSURE_RATE_TARGET).toBe(90);
    expect(evaluateActionClosureRate({ kind: "RATE", value: 92 })).toBe(
      "ACHIEVED",
    );
    expect(evaluateActionClosureRate({ kind: "RATE", value: 90 })).toBe(
      "ACHIEVED",
    );
    expect(evaluateActionClosureRate({ kind: "RATE", value: 89 })).toBe(
      "NOT_ACHIEVED",
    );
  });

  it("treats confirmed no-actions as achieved without inventing a rate", () => {
    expect(evaluateActionClosureRate({ kind: "CONFIRMED_NO_ACTIONS" })).toBe(
      "ACHIEVED",
    );
  });

  it("is undetermined for unavailable or invalid input", () => {
    expect(evaluateActionClosureRate({ kind: "UNDETERMINED" })).toBe(
      "UNDETERMINED",
    );
    expect(
      evaluateActionClosureRate({ kind: "RATE", value: Number.NaN }),
    ).toBe("UNDETERMINED");
    expect(evaluateActionClosureRate({ kind: "RATE", value: 101 })).toBe(
      "UNDETERMINED",
    );
  });
});
