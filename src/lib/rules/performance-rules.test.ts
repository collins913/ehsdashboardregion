import { describe, expect, it } from "vitest";
import {
  evaluateActionClosureRate,
  evaluateDrillPerformance,
  evaluateInspectionPerformance,
  evaluateTrainingPerformance,
} from "./performance-rules";

describe("Training KPI", () => {
  it("is achieved when every required Training is fully completed", () => {
    expect(
      evaluateTrainingPerformance([
        { requiredTrainingCompletion: [true, true] },
        { requiredTrainingCompletion: [true] },
      ]),
    ).toBe("ACHIEVED");
  });

  it("is not achieved when one required Training is incomplete", () => {
    expect(
      evaluateTrainingPerformance([
        { requiredTrainingCompletion: [true] },
        { requiredTrainingCompletion: [true, false] },
      ]),
    ).toBe("NOT_ACHIEVED");
  });

  it("is undetermined when the required set is unavailable", () => {
    expect(evaluateTrainingPerformance(null)).toBe("UNDETERMINED");
    expect(evaluateTrainingPerformance([])).toBe("UNDETERMINED");
    expect(
      evaluateTrainingPerformance([{ requiredTrainingCompletion: null }]),
    ).toBe("UNDETERMINED");
    expect(
      evaluateTrainingPerformance([{ requiredTrainingCompletion: [] }]),
    ).toBe("UNDETERMINED");
  });
});

describe("Drill KPI", () => {
  it("is achieved when every included month has a completed Drill", () => {
    expect(
      evaluateDrillPerformance([
        { completedDrillCount: 1 },
        { completedDrillCount: 2 },
      ]),
    ).toBe("ACHIEVED");
  });

  it("is not achieved when an included month has zero completed Drills", () => {
    expect(
      evaluateDrillPerformance([
        { completedDrillCount: 1 },
        { completedDrillCount: 0 },
      ]),
    ).toBe("NOT_ACHIEVED");
  });

  it("accepts multiple completed Drills in a month", () => {
    expect(evaluateDrillPerformance([{ completedDrillCount: 3 }])).toBe(
      "ACHIEVED",
    );
  });

  it("is undetermined for an unavailable or invalid included-month set", () => {
    expect(evaluateDrillPerformance(null)).toBe("UNDETERMINED");
    expect(evaluateDrillPerformance([])).toBe("UNDETERMINED");
    expect(evaluateDrillPerformance([{ completedDrillCount: -1 }])).toBe(
      "UNDETERMINED",
    );
  });
});

describe("Actions KPI", () => {
  it("does not evaluate without a confirmed target", () => {
    expect(evaluateActionClosureRate(90, null)).toBe("UNDETERMINED");
  });

  it("is undetermined for missing or invalid values", () => {
    expect(evaluateActionClosureRate(null, 90)).toBe("UNDETERMINED");
    expect(evaluateActionClosureRate(Number.NaN, 90)).toBe("UNDETERMINED");
    expect(evaluateActionClosureRate(101, 90)).toBe("UNDETERMINED");
  });

  it("uses only an explicitly supplied valid target", () => {
    expect(evaluateActionClosureRate(89, 90)).toBe("NOT_ACHIEVED");
    expect(evaluateActionClosureRate(90, 90)).toBe("ACHIEVED");
  });
});

describe("Inspections KPI", () => {
  it("is achieved when all required Inspections are completed", () => {
    expect(evaluateInspectionPerformance([true, true])).toBe("ACHIEVED");
  });

  it("is not achieved when one required Inspection is incomplete", () => {
    expect(evaluateInspectionPerformance([true, false])).toBe("NOT_ACHIEVED");
  });

  it("is undetermined when the required set is unavailable", () => {
    expect(evaluateInspectionPerformance(null)).toBe("UNDETERMINED");
    expect(evaluateInspectionPerformance([])).toBe("UNDETERMINED");
  });
});
