import { describe, expect, it } from "vitest";
import { buildTakeChargeMonthlyAggregates } from "@/data/take-charge-monthly-aggregate";
import type { NormalizedTakeChargeRecord } from "@/data/contracts/take-charge";

function record(
  tchId: string,
  submittedAt: NormalizedTakeChargeRecord["submittedAt"],
  sourceStatus: string,
): NormalizedTakeChargeRecord {
  return {
    storeId: "TEST-001",
    storeDisplayName: "测试门店",
    tchId,
    submittedBy: "测试人员",
    submittedAt,
    summary: "测试建议",
    sourceStatus,
    recordState: sourceStatus === "Submitted" ? "OPEN" : "CLOSED",
    extraFields: {},
  };
}

describe("Take Charge monthly aggregate", () => {
  it("groups by canonical store and Asia/Shanghai month", () => {
    expect(
      buildTakeChargeMonthlyAggregates([
        record("TCH-1", "2026-08-31T16:30:00Z", "ClosedWithAction"),
        record("TCH-2", "2026-09-02T09:00:00+08:00", "Submitted"),
      ]),
    ).toEqual([
      {
        storeId: "TEST-001",
        month: "2026-09",
        totalCount: 2,
        closedCount: 1,
      },
    ]);
  });

  it("recognizes only the three terminal statuses after trimming", () => {
    const aggregates = buildTakeChargeMonthlyAggregates([
      record("1", "2026-09-01T09:00:00+08:00", " Declined "),
      record("2", "2026-09-02T09:00:00+08:00", "ClosedWithAction"),
      record("3", "2026-09-03T09:00:00+08:00", "ClosedWithoutAction"),
      record("4", "2026-09-04T09:00:00+08:00", "InProgress"),
    ]);

    expect(aggregates[0]).toMatchObject({ totalCount: 4, closedCount: 3 });
  });
});
