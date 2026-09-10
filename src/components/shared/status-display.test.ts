import { describe, expect, it } from "vitest";
import {
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
});
