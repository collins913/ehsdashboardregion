import { describe, expect, it } from "vitest";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

describe("business date and time presentation", () => {
  it("formats timezone-aware instants in Asia/Shanghai", () => {
    expect(formatBusinessDate("2026-09-22T16:15:00Z")).toBe("2026-09-23");
    expect(formatBusinessDateTime("2026-09-22T16:15:00Z")).toBe(
      "2026-09-23 00:15",
    );
  });

  it("keeps missing or invalid values neutral", () => {
    expect(formatBusinessDateTime(null)).toBe("—");
    expect(formatBusinessDate("invalid")).toBe("—");
  });
});
