import { describe, expect, it } from "vitest";
import {
  getStatusEmphasis,
  getStatusIntent,
  getStatusLabel,
  type BusinessStatus,
} from "@/components/shared/status-display";

const allStatuses: readonly BusinessStatus[] = [
  "ACHIEVED",
  "NOT_ACHIEVED",
  "UNDETERMINED",
  "OCCURRED",
  "NOT_OCCURRED",
  "OPEN",
  "CLOSED",
  "EXCLUDED",
  "UNKNOWN",
  "NORMAL",
  "ABNORMAL",
];

describe("StatusDisplay semantics", () => {
  it("maps every supported business status", () => {
    for (const status of allStatuses) {
      expect(getStatusLabel(status)).not.toBe("");
      expect(["POSITIVE", "NEGATIVE", "NEUTRAL"]).toContain(
        getStatusIntent(status),
      );
    }
  });

  it("keeps confirmed negative outcomes together", () => {
    expect(getStatusIntent("NOT_ACHIEVED")).toBe("NEGATIVE");
    expect(getStatusIntent("OCCURRED")).toBe("NEGATIVE");
    expect(getStatusIntent("ABNORMAL")).toBe("NEGATIVE");
  });

  it("does not treat lifecycle states as performance conclusions", () => {
    expect(getStatusIntent("OPEN")).toBe("NEUTRAL");
    expect(getStatusIntent("CLOSED")).toBe("NEUTRAL");
    expect(getStatusIntent("EXCLUDED")).toBe("NEUTRAL");
    expect(getStatusIntent("UNKNOWN")).toBe("NEUTRAL");
  });

  it("centralizes Chinese status labels", () => {
    expect(
      Object.fromEntries(
        allStatuses.map((status) => [status, getStatusLabel(status)]),
      ),
    ).toEqual({
      ACHIEVED: "达成",
      NOT_ACHIEVED: "进行中",
      UNDETERMINED: "未确定",
      OCCURRED: "发生",
      NOT_OCCURRED: "无",
      OPEN: "未关闭",
      CLOSED: "已关闭",
      EXCLUDED: "已排除",
      UNKNOWN: "未知",
      NORMAL: "正常",
      ABNORMAL: "异常",
    });
  });

  it("maps status presentation emphasis independently from business intent", () => {
    for (const status of ["NOT_ACHIEVED", "OCCURRED", "ABNORMAL"] as const) {
      expect(getStatusEmphasis(status)).toBe("PRIMARY");
    }

    for (const status of ["ACHIEVED", "NOT_OCCURRED", "CLOSED", "NORMAL"] as const) {
      expect(getStatusEmphasis(status)).toBe("SECONDARY");
    }

    for (const status of ["UNDETERMINED", "OPEN", "EXCLUDED", "UNKNOWN"] as const) {
      expect(getStatusEmphasis(status)).toBe("NEUTRAL");
    }
  });
});
