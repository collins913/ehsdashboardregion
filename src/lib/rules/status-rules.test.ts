import { describe, expect, it } from "vitest";
import type { ActionRecord, EventRecord, TakeChargeRecord } from "@/types/ehs";
import { classifyActionRecordState } from "./action-rules";
import {
  classifyEventRecordState,
  evaluateAstmOccurrence,
  isEventOpen,
} from "./event-rules";
import {
  classifyTakeChargeRecordState,
  isTakeChargeOpen,
} from "./take-charge-rules";

function action(Status: ActionRecord["Status"]): ActionRecord {
  return {
    actionId: "A-1",
    storeReference: { trtid: "TEST-001" },
    actionTitle: "Test",
    owner: "Test",
    createdDate: "2026-09-01",
    dueDate: "2026-09-10",
    closedDate: null,
    Status,
  };
}

function event(astm: string, Status = "Open"): EventRecord {
  return {
    eventId: "E-1",
    storeReference: { trtid: "TEST-001" },
    eventDateTime: "2026-09-10T00:00:00+08:00",
    eventType: "Non-Agency Event",
    titleSummary: "Test",
    Status,
    ASTMInjuryIllness: astm,
  };
}

function takeCharge(Status: string): TakeChargeRecord {
  return {
    storeReference: { trtid: "TEST-001" },
    submitter: "Test",
    submittedDate: "2026-09-10",
    summary: "Test",
    Status,
  };
}

describe("record status normalization", () => {
  it("classifies Event Closed and every non-Closed status", () => {
    expect(classifyEventRecordState("Closed")).toBe("CLOSED");
    expect(classifyEventRecordState("UnderReview")).toBe("OPEN");
    expect(isEventOpen(event("No", "Closed"))).toBe(false);
    expect(isEventOpen(event("No", "Pending"))).toBe(true);
  });

  it.each(["ClosedWithAction", "ClosedWithoutAction", "Declined"])(
    "classifies Take Charge %s as CLOSED",
    (status) => {
      expect(classifyTakeChargeRecordState(status)).toBe("CLOSED");
      expect(isTakeChargeOpen(takeCharge(status))).toBe(false);
    },
  );

  it("classifies every other Take Charge status as OPEN", () => {
    expect(classifyTakeChargeRecordState("InProgress")).toBe("OPEN");
    expect(isTakeChargeOpen(takeCharge("InProgress"))).toBe(true);
  });

  it.each([
    [{ kind: "KNOWN", value: "Assigned" }, "OPEN"],
    [{ kind: "KNOWN", value: "InProgress" }, "OPEN"],
    [{ kind: "KNOWN", value: "Closed" }, "CLOSED"],
    [{ kind: "KNOWN", value: "Cancelled" }, "EXCLUDED"],
    [{ kind: "UNKNOWN", value: "PendingReview" }, "UNKNOWN"],
  ] as const)("classifies Action status %#", (Status, expected) => {
    expect(classifyActionRecordState(action(Status))).toBe(expected);
  });
});

describe("ASTM occurrence", () => {
  it("returns NOT_OCCURRED when no ASTM Event exists", () => {
    expect(evaluateAstmOccurrence([event("No")])).toBe("NOT_OCCURRED");
  });

  it("returns OCCURRED for one ASTM Event", () => {
    expect(evaluateAstmOccurrence([event("Yes")])).toBe("OCCURRED");
  });

  it("returns OCCURRED when one of multiple Events is ASTM", () => {
    expect(evaluateAstmOccurrence([event("No"), event("Yes"), event("No")])).toBe(
      "OCCURRED",
    );
  });
});
