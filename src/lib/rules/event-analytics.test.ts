import { describe, expect, it } from "vitest";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { buildEventAnalytics } from "./event-analytics";

const context: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-01", "2026-04")!,
};

function event(overrides: Partial<NormalizedEventRecord>): NormalizedEventRecord {
  return {
    storeId: "STORE-1",
    storeDisplayName: "测试门店",
    eventId: "EVENT-1",
    eventType: "Near Miss",
    submittedBy: "测试人员",
    eventDate: "2026-01-10T09:00:00+08:00",
    description: "测试事件",
    sourceStatus: "Open",
    recordState: "OPEN",
    astmInjuryIllness: "No",
    ...overrides,
  };
}

describe("Event Analytics rules", () => {
  it("aggregates total and type counts, excludes UNKNOWN from closure, and fills month/type series", () => {
    const result = buildEventAnalytics(context, [
      event({ eventId: "closed", eventType: "Agency Contact", recordState: "CLOSED" }),
      event({ eventId: "unknown", eventType: "Agency Contact", eventDate: "2026-02-10T09:00:00+08:00", recordState: "UNKNOWN" }),
      event({ eventId: "open", eventDate: "2026-03-10T09:00:00+08:00" }),
    ]);

    expect(result.totalCount).toBe(3);
    expect(result.byType).toEqual([
      { eventType: "Agency Contact", count: 2 },
      { eventType: "Near Miss", count: 1 },
    ]);
    expect(result.closure).toEqual({ closedCount: 1, openCount: 1, closureRate: 50 });
    expect(result.monthly).toEqual([
      { month: "2026-01", eventCount: 1, closureRate: 100 },
      { month: "2026-02", eventCount: 1, closureRate: null },
      { month: "2026-03", eventCount: 1, closureRate: 0 },
      { month: "2026-04", eventCount: 0, closureRate: null },
    ]);
    expect(result.trendSeries[0]?.monthly).toEqual([
      { month: "2026-01", eventCount: 1 },
      { month: "2026-02", eventCount: 1 },
      { month: "2026-03", eventCount: 1 },
      { month: "2026-04", eventCount: 0 },
    ]);
    expect(result.trendSeries.find(({ eventType }) => eventType === "Agency Contact")?.monthly).toEqual([
      { month: "2026-01", eventCount: 1 },
      { month: "2026-02", eventCount: 1 },
      { month: "2026-03", eventCount: 0 },
      { month: "2026-04", eventCount: 0 },
    ]);
  });

  it("returns null closure rate when the denominator has no evaluable records", () => {
    expect(buildEventAnalytics(context, [event({ recordState: "UNKNOWN" })]).closure).toEqual({
      closedCount: 0,
      openCount: 0,
      closureRate: null,
    });
  });
});
