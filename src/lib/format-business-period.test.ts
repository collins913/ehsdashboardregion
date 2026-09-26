import { describe, expect, it } from "vitest";
import type { KpiPeriod } from "@/data/contracts/kpi";
import { formatBusinessPeriod } from "@/lib/format-business-period";

describe("business Period display formatter", () => {
  it("formats a single month", () => {
    expect(formatBusinessPeriod({
      startInclusive: "2026-09-01T00:00:00+08:00",
      endExclusive: "2026-10-01T00:00:00+08:00",
      includedMonths: ["2026-09"],
    })).toBe("2026 年 9 月");
  });

  it("formats a continuous selected range", () => {
    expect(formatBusinessPeriod({
      startInclusive: "2026-07-01T00:00:00+08:00",
      endExclusive: "2026-10-01T00:00:00+08:00",
      includedMonths: ["2026-07", "2026-08", "2026-09"],
    })).toBe("2026 年 7 月–2026 年 9 月");
  });

  it("formats cross-year and annual ranges without changing their period meaning", () => {
    expect(formatBusinessPeriod({
      startInclusive: "2025-12-01T00:00:00+08:00",
      endExclusive: "2026-02-01T00:00:00+08:00",
      includedMonths: ["2025-12", "2026-01"],
    })).toBe("2025 年 12 月–2026 年 1 月");
    expect(formatBusinessPeriod({
      startInclusive: "2026-01-01T00:00:00+08:00",
      endExclusive: "2027-01-01T00:00:00+08:00",
      includedMonths: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"],
    })).toBe("2026 年 1 月–2026 年 12 月");
  });

  it("uses a neutral label for unavailable or invalid period contracts", () => {
    expect(formatBusinessPeriod(null)).toBe("—");
    expect(formatBusinessPeriod({
      startInclusive: "2026-07-01T00:00:00+08:00",
      endExclusive: "2026-10-01T00:00:00+08:00",
      includedMonths: ["2026-07", "2026-09"],
    } as KpiPeriod)).toBe("—");
  });
});
