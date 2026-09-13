import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NormalizedActionRecord } from "@/data/contracts/actions";
import {
  ActionDetailContent,
  ActionsDataTable,
  DEFAULT_ACTION_COLUMN_VISIBILITY,
  DEFAULT_ACTIONS_VIEW_MODE,
  DEFAULT_VISIBLE_ACTION_COLUMN_IDS,
} from "./actions-data-table";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

const record: NormalizedActionRecord = {
  storeId: "TEST-001",
  storeDisplayName: "测试门店",
  actionId: "ACTION-001",
  problem: "完整问题内容",
  action: "完整行动项内容",
  submittedBy: "提交人",
  owner: "负责人",
  submittedDate: "2026-09-01T09:15:00+08:00",
  dueDate: "2026-09-30T18:00:00+08:00",
  closedDate: null,
  sourceStatus: { kind: "KNOWN", value: "In Progress" },
  recordState: "OPEN",
};

describe("Actions table defaults", () => {
  it("defaults to Current Open", () => {
    expect(DEFAULT_ACTIONS_VIEW_MODE).toBe("OPEN_ONLY");
  });

  it("shows six primary columns and hides four secondary columns", () => {
    expect(DEFAULT_VISIBLE_ACTION_COLUMN_IDS).toEqual([
      "store",
      "actionId",
      "problem",
      "action",
      "dueDate",
      "status",
    ]);
    expect(DEFAULT_ACTION_COLUMN_VISIBILITY).toEqual({
      owner: false,
      submittedBy: false,
      submittedDate: false,
      closedDate: false,
    });
  });

  it("does not render business rows before adaptive measurement", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(ActionsDataTable, {
          rows: [record],
          availability: "AVAILABLE",
          viewMode: "OPEN_ONLY",
          onViewModeChange: () => {},
        }),
      ),
    );

    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).toContain("时间范围：提交时间");
    expect(markup).toContain("w-32 min-w-32 max-w-32");
    expect(markup).toContain("w-[18%] min-w-36 max-w-52");
    expect(markup).not.toContain("ACTION-001");
    expect(markup).not.toContain("完整问题内容");
  });
});

describe("Action detail", () => {
  it("renders complete Problem and Action content", () => {
    const markup = renderToStaticMarkup(
      createElement(TooltipProvider, null, createElement(ActionDetailContent, { record })),
    );

    expect(markup).toContain("完整问题内容");
    expect(markup).toContain("完整行动项内容");
    expect(markup).toContain("进行中");
    expect(markup).toContain('data-emphasis="primary"');
    expect(markup).toContain("关闭时间");
    expect(markup).toContain("2026-09-01 09:15");
    expect(markup).toContain("2026-09-30 18:00");
    expect(markup).toContain("—");
    expect(markup).not.toContain("TRTID");
  });

  it("uses the shared business-time formatter", () => {
    expect(formatBusinessDate(record.submittedDate)).toBe("2026-09-01");
    expect(formatBusinessDateTime(record.dueDate)).toBe("2026-09-30 18:00");
    expect(formatBusinessDateTime(null)).toBe("—");
  });

  it.each([
    ["Closed", "CLOSED", "已关闭"],
    ["Cancelled", "EXCLUDED", "已取消"],
  ] as const)(
    "reuses the closed visual for %s without changing %s domain state",
    (sourceStatus, recordState, label) => {
      const markup = renderToStaticMarkup(
        createElement(
          TooltipProvider,
          null,
          createElement(ActionDetailContent, {
            record: {
              ...record,
              sourceStatus: { kind: "KNOWN", value: sourceStatus },
              recordState,
            },
          }),
        ),
      );

      expect(markup).toContain(label);
      expect(markup).toContain('data-emphasis="secondary"');
    },
  );

  it("keeps an unknown workflow visually neutral", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(ActionDetailContent, {
          record: {
            ...record,
            sourceStatus: { kind: "UNKNOWN", value: "Future Status" },
            recordState: "UNKNOWN",
          },
        }),
      ),
    );

    expect(markup).toContain("未知");
    expect(markup).toContain('data-emphasis="neutral"');
  });
});
