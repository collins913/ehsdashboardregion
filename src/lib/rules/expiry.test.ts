import { describe, expect, it } from "vitest";
import { evaluateExpiry, isValidIsoDate } from "./expiry";

const policy = { referenceDate: "2026-09-10" };

describe("evaluateExpiry", () => {
  it("returns expired before referenceDate", () => {
    expect(evaluateExpiry("2026-09-09", policy)).toBe("expired");
  });

  it("returns valid on referenceDate", () => {
    expect(evaluateExpiry("2026-09-10", policy)).toBe("valid");
  });

  it("returns valid after referenceDate", () => {
    expect(evaluateExpiry("2026-09-11", policy)).toBe("valid");
  });

  it("returns unknown for missing, malformed, and impossible dates", () => {
    expect(evaluateExpiry(null, policy)).toBe("unknown");
    expect(evaluateExpiry(undefined, policy)).toBe("unknown");
    expect(evaluateExpiry("10/09/2026", policy)).toBe("unknown");
    expect(evaluateExpiry("2026-02-30", policy)).toBe("unknown");
    expect(evaluateExpiry("2024-02-29", policy)).toBe("expired");
    expect(isValidIsoDate("2025-02-29")).toBe(false);
  });

  it("returns unknown when referenceDate is invalid", () => {
    expect(evaluateExpiry("2026-09-10", { referenceDate: "invalid" })).toBe(
      "unknown",
    );
  });
});
