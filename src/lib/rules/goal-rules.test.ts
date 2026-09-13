import { describe, expect, it } from "vitest";
import {
  calculateTakeChargeCloseRate,
  evaluateTakeChargeCloseRate,
  evaluateTakeChargeParticipateRate,
  evaluateTakeChargeSubmissionsPerCapita,
} from "./goal-rules";

describe("Take Charge Close Rate calculation", () => {
  it("uses total closed records over total records", () => {
    expect(calculateTakeChargeCloseRate(9, 10)).toBe(90);
    expect(calculateTakeChargeCloseRate(1, 4)).toBe(25);
  });

  it("does not invent a percentage for an empty or invalid denominator", () => {
    expect(calculateTakeChargeCloseRate(0, 0)).toBeNull();
    expect(calculateTakeChargeCloseRate(3, 2)).toBeNull();
  });
});

describe.each([
  ["Submissions per Capita", evaluateTakeChargeSubmissionsPerCapita, 4],
  ["Close Rate", evaluateTakeChargeCloseRate, 90],
  ["Participate Rate", evaluateTakeChargeParticipateRate, 50],
] as const)("Take Charge %s", (_name, evaluate, threshold) => {
  it("is not achieved below the threshold", () => {
    expect(evaluate(threshold - 0.1)).toBe("NOT_ACHIEVED");
  });

  it("is achieved exactly at the threshold", () => {
    expect(evaluate(threshold)).toBe("ACHIEVED");
  });

  it("is achieved above the threshold", () => {
    expect(evaluate(threshold + 0.1)).toBe("ACHIEVED");
  });

  it("is undetermined when the value is missing", () => {
    expect(evaluate(null)).toBe("UNDETERMINED");
  });
});

it("rejects invalid percentage values", () => {
  expect(evaluateTakeChargeCloseRate(101)).toBe("UNDETERMINED");
  expect(evaluateTakeChargeParticipateRate(-1)).toBe("UNDETERMINED");
});
