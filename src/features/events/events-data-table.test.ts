import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NormalizedEventRecord } from "@/data/contracts/events";
import {
  DEFAULT_EVENT_COLUMN_VISIBILITY,
  DEFAULT_EVENTS_VIEW_MODE,
  DEFAULT_VISIBLE_EVENT_COLUMN_IDS,
  EventDetailContent,
  EventsDataTable,
} from "./events-data-table";

const record: NormalizedEventRecord = {
  storeId: "TEST-001",
  storeDisplayName: "测试门店",
  eventId: "EVENT-001",
  eventType: "Agency Contact",
  submittedBy: "提交人",
  eventDate: "2026-09-01",
  description: "完整事件描述",
  sourceStatus: "Open",
  recordState: "OPEN",
  astmInjuryIllness: "No",
};

describe("Events table defaults", () => {
  it("defaults to Current Open with six visible columns", () => {
    expect(DEFAULT_EVENTS_VIEW_MODE).toBe("OPEN_ONLY");
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

  it("reuses adaptive measurement, table layout and the Event Date hint", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(EventsDataTable, {
          rows: [record],
          availability: "AVAILABLE",
          viewMode: "OPEN_ONLY",
          onViewModeChange: () => {},
          eventType: null,
          eventTypeOptions: ["Agency Contact"],
          onEventTypeChange: () => {},
        }),
      ),
    );

    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).toContain("时间范围：事件日期");
    expect(markup).toContain("w-28 min-w-28 max-w-28");
    expect(markup).toContain("w-36 min-w-36 max-w-36");
    expect(markup).toContain("w-[20%] min-w-32");
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

    expect(markup).toContain("测试门店");
    expect(markup).toContain("EVENT-001");
    expect(markup).toContain("Agency Contact");
    expect(markup).toContain("完整事件描述");
    expect(markup).toContain("提交人");
    expect(markup).toContain("2026-09-01");
    expect(markup).toContain("未关闭");
    expect(markup).not.toContain("TRTID");
    expect(markup).not.toContain("门店英文");
    expect(markup).not.toContain("Severity");
  });
});
