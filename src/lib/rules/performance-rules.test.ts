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
        true,
        true,
        true,
      ]),
    ).toBe("ACHIEVED");
  });

  it("is not achieved when one required Training is incomplete", () => {
    expect(
      evaluateTrainingPerformance([
        true,
        false,
      ]),
    ).toBe("NOT_ACHIEVED");
  });

  it("is achieved when the complete source contains no Training records", () => {
    expect(evaluateTrainingPerformance([])).toBe("ACHIEVED");
  });

  it("is undetermined only when the source input is unavailable", () => {
    expect(evaluateTrainingPerformance(null)).toBe("UNDETERMINED");
  });
});

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
    expect(
      evaluateInspectionPerformance([
        { requiredInspectionCompletion: [true] },
        { requiredInspectionCompletion: [true, true] },
      ]),
    ).toBe("ACHIEVED");
  });

  it("is not achieved when one required Inspection is incomplete", () => {
    expect(
      evaluateInspectionPerformance([
        { requiredInspectionCompletion: [true] },
        { requiredInspectionCompletion: [true, false] },
      ]),
    ).toBe("NOT_ACHIEVED");
  });

  it("is not achieved when an included month has no Inspection", () => {
    expect(
      evaluateInspectionPerformance([
        { requiredInspectionCompletion: [true] },
        { requiredInspectionCompletion: [] },
      ]),
    ).toBe("NOT_ACHIEVED");
  });

  it("is undetermined when the included-month set is unavailable", () => {
    expect(evaluateInspectionPerformance(null)).toBe("UNDETERMINED");
    expect(evaluateInspectionPerformance([])).toBe("UNDETERMINED");
  });
});
