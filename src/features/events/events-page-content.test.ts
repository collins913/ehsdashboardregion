import { describe, expect, it, vi } from "vitest";
import type { NormalizedEventRecord } from "@/data/contracts/events";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import {
  eventTypeOptionsFromRecords,
  loadEventsPageData,
} from "./events-page-content";

const context: KpiFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: periodFromMonthRange("2026-09", "2026-09")!,
};

function record(eventType: string): NormalizedEventRecord {
  return {
    storeId: "TEST-001",
    storeDisplayName: "测试门店",
    eventId: `EVENT-${eventType}`,
    eventType,
    submittedBy: "提交人",
    eventDate: "2026-09-01",
    description: "描述",
    sourceStatus: "Open",
    recordState: "OPEN",
    astmInjuryIllness: "No",
  };
}

describe("Events page data binding", () => {
  it("passes Global Filters, view mode and optional Event Type to Repository", () => {
    const getEvents = vi.fn(() => ({
      availability: "CONFIRMED_EMPTY" as const,
      items: [] as const,
    }));

    loadEventsPageData(context, "OPEN_ONLY", { getEvents }, "Agency Contact");

    expect(getEvents).toHaveBeenCalledWith({
      context,
      viewMode: "OPEN_ONLY",
      eventType: "Agency Contact",
    });
  });

  it("does not query when Global Filter Context is invalid", () => {
    const getEvents = vi.fn();

    expect(loadEventsPageData(null, "ALL", { getEvents })).toBeNull();
    expect(getEvents).not.toHaveBeenCalled();
  });

  it("derives stable sorted Event Type options from normalized records", () => {
    expect(
      eventTypeOptionsFromRecords([
        record("Near Miss"),
        record("Agency Contact"),
        record("Community Visit"),
        record("Agency Contact"),
      ]),
    ).toEqual(["Agency Contact", "Community Visit", "Near Miss"]);
  });
});
