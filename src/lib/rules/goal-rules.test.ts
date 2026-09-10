import { describe, expect, it } from "vitest";
import {
  evaluateTakeChargeCloseRate,
  evaluateTakeChargeParticipateRate,
  evaluateTakeChargeSubmissionsPerCapita,
} from "./goal-rules";

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
