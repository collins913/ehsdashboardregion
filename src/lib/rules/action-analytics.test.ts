import { describe, expect, it } from "vitest";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { NormalizedActionRecord } from "@/data/contracts/action-record";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { buildActionAnalytics } from "./action-analytics";

const context: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-01", "2026-03")!,
};

function action(
  sourceStatus: NormalizedActionRecord["sourceStatus"],
  submittedDate: string,
): NormalizedActionRecord {
  return {
    storeId: "STORE-1",
    storeDisplayName: "测试门店",
    actionId: `${sourceStatus.kind}-${"value" in sourceStatus ? sourceStatus.value : "unknown"}-${submittedDate}`,
    problem: "测试问题",
    action: "测试行动",
    submittedBy: "测试人员",
    owner: "负责人",
    submittedDate: `${submittedDate}T09:00:00+08:00`,
    dueDate: `${submittedDate}T17:00:00+08:00`,
    closedDate: null,
    sourceStatus,
    recordState:
      sourceStatus.kind === "UNKNOWN"
        ? "UNKNOWN"
        : sourceStatus.value === "Closed"
          ? "CLOSED"
          : sourceStatus.value === "Cancelled"
            ? "EXCLUDED"
            : "OPEN",
  };
}

describe("Action Analytics rules", () => {
  it("counts Closed and Cancelled over all records and fills monthly counts", () => {
    const records = [
      action({ kind: "KNOWN", value: "Assigned" }, "2026-01-10"),
      action({ kind: "KNOWN", value: "In Progress" }, "2026-01-11"),
      action({ kind: "KNOWN", value: "In Review" }, "2026-03-10"),
      action({ kind: "KNOWN", value: "Sign Off" }, "2026-03-11"),
      action({ kind: "KNOWN", value: "Closed" }, "2026-03-12"),
      action({ kind: "KNOWN", value: "Cancelled" }, "2026-03-13"),
      action({ kind: "UNKNOWN", value: "Future Status" }, "2026-03-14"),
    ];
    const result = buildActionAnalytics(context, records);

    expect(result.closure).toEqual({
      closedOrCancelledCount: 2,
      otherCount: 5,
      closureRate: (2 / 7) * 100,
    });
    expect(result.byStatus).toEqual([0, 1, 2, 3, 6, 5, 4].map((index) => ({ sourceStatus: records[index].sourceStatus, count: 1 })));
    expect(result.monthly).toEqual([
      { month: "2026-01", actionCount: 2 },
      { month: "2026-02", actionCount: 0 },
      { month: "2026-03", actionCount: 5 },
    ]);
  });

  it("returns a null rate and zero-filled months when there are no records", () => {
    const result = buildActionAnalytics(context, []);
    expect(result.closure).toEqual({ closedOrCancelledCount: 0, otherCount: 0, closureRate: null });
    expect(result.byStatus).toEqual([]);
    expect(result.monthly).toEqual([
      { month: "2026-01", actionCount: 0 },
      { month: "2026-02", actionCount: 0 },
      { month: "2026-03", actionCount: 0 },
    ]);
  });
  it("groups exact source statuses without merging unknown text or different workflow states", () => {
    const result = buildActionAnalytics(context, [
      action({ kind: "KNOWN", value: "Assigned" }, "2026-01-10"),
      action({ kind: "KNOWN", value: "Assigned" }, "2026-01-11"),
      action({ kind: "KNOWN", value: "In Progress" }, "2026-01-12"),
      action({ kind: "UNKNOWN", value: "Future Status" }, "2026-01-13"),
      action({ kind: "UNKNOWN", value: "Other Source Status" }, "2026-01-14"),
    ]);
    expect(result.byStatus).toEqual([
      { sourceStatus: { kind: "KNOWN", value: "Assigned" }, count: 2 },
      { sourceStatus: { kind: "KNOWN", value: "In Progress" }, count: 1 },
      { sourceStatus: { kind: "UNKNOWN", value: "Future Status" }, count: 1 },
      { sourceStatus: { kind: "UNKNOWN", value: "Other Source Status" }, count: 1 },
    ]);
    expect(result.closure).toEqual({ closedOrCancelledCount: 0, otherCount: 5, closureRate: 0 });
  });

  it("puts Cancelled then Closed last while preserving other source status order", () => {
    const result = buildActionAnalytics(context, [
      action({ kind: "KNOWN", value: "Closed" }, "2026-01-10"),
      action({ kind: "KNOWN", value: "In Progress" }, "2026-01-11"),
      action({ kind: "KNOWN", value: "Cancelled" }, "2026-01-12"),
      action({ kind: "UNKNOWN", value: "Future Status" }, "2026-01-13"),
      action({ kind: "KNOWN", value: "Assigned" }, "2026-01-14"),
    ]);
    expect(result.byStatus.map(({ sourceStatus }) => sourceStatus.value)).toEqual([
      "In Progress", "Future Status", "Assigned", "Cancelled", "Closed",
    ]);
    expect(result.closure.closureRate).toBe(40);
  });

});
