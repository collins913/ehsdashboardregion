import { describe, expect, it } from "vitest";
import { scoreOutcomes } from "./overview-demo-score";

describe("Overview Demo score", () => {
  it("scores full pass", () => {
    expect(scoreOutcomes(["PASS", "PASS"])).toMatchObject({ score: 100, completeness: 100 });
  });

  it("scores partial fail", () => {
    expect(scoreOutcomes(["PASS", "FAIL", "FAIL", "PASS"])).toMatchObject({ score: 50, passedCount: 2 });
  });

  it("does not count missing as fail", () => {
    expect(scoreOutcomes(["PASS", "MISSING"])).toMatchObject({ score: 100, availableCount: 1 });
  });

  it("reports completeness against expected items", () => {
    expect(scoreOutcomes(["PASS", "FAIL", "MISSING", "MISSING"])).toMatchObject({ completeness: 50, expectedCount: 4 });
  });
});
