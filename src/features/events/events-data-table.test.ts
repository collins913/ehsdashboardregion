import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NormalizedEventRecord } from "@/data/contracts/events";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import {
  DEFAULT_EVENT_COLUMN_VISIBILITY,
  DEFAULT_EVENTS_VIEW_MODE,
  DEFAULT_VISIBLE_EVENT_COLUMN_IDS,
  EVENT_COLUMN_SIZE_ROLES,
  EventsDataTable,
  getEventRowId,
} from "./events-data-table";
import { EventDetailContent } from "./event-detail-content";

const record: NormalizedEventRecord = {
  storeId: "TEST-001",
  storeDisplayName: "测试门店",
  eventId: "EVENT-001",
  eventType: "Agency Contact",
  submittedBy: "提交人",
  eventDate: "2026-09-01T09:30:00+08:00",
  description: "完整事件描述",
  sourceStatus: "Open",
  recordState: "OPEN",
  astmInjuryIllness: "No",
};

describe("Events table defaults", () => {
  it("defaults to All with six visible columns", () => {
    expect(DEFAULT_EVENTS_VIEW_MODE).toBe("ALL");
    expect(DEFAULT_VISIBLE_EVENT_COLUMN_IDS).toEqual([
      "store",
      "eventId",
      "eventType",
      "description",
      "eventDate",
      "status",
    ]);
    expect(DEFAULT_EVENT_COLUMN_VISIBILITY).toEqual({ submittedBy: false });
  });

  it("uses the stable Event ID as row identity", () => {
    expect(getEventRowId(record)).toBe("EVENT-001");
  });

  it("reuses adaptive measurement, table layout and the Event Date hint", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(EventsDataTable, {
          context: {
            region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
            period: periodFromMonthRange("2026-09", "2026-09")!,
          },
          referenceDateIso: "2026-09-11T00:00:00+08:00",
          viewMode: "OPEN_ONLY",
          onViewModeChange: () => {},
          eventType: null,
          onEventTypeChange: () => {},
          queryEvents: async () => { throw new Error("not called before measurement"); },
        }),
      ),
    );

    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).toContain("时间范围：事件时间");
    expect(EVENT_COLUMN_SIZE_ROLES).toEqual({
      store: "primary",
      eventId: "compact",
      eventType: "standard",
      description: "content",
      eventDate: "compact",
      status: "compact",
      submittedBy: "standard",
    });
    expect(markup).toContain("w-[22%] min-w-36 max-w-72");
    expect(markup).not.toContain("EVENT-001");
  });
});

describe("Event detail", () => {
  it("renders only the confirmed common fields and the full description", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(EventDetailContent, { record }),
      ),
    );

    expect(markup).not.toContain("测试门店");
    expect(markup).toContain("EVENT-001");
    expect(markup).toContain("Agency Contact");
    expect(markup).toContain("完整事件描述");
    expect(markup).toContain("提交人");
    expect(markup).toContain("2026-09-01 09:30");
    expect(markup).toContain("未关闭");
    expect(markup).not.toContain("TRTID");
    expect(markup).not.toContain("门店英文");
    expect(markup).not.toContain("Severity");
  });
});
