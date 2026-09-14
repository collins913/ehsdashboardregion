import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DEFAULT_TAKE_CHARGE_VIEW_MODE,
  DEFAULT_VISIBLE_TAKE_CHARGE_COLUMN_IDS,
  getTakeChargeRowId,
  resetTakeChargePageIndex,
  TAKE_CHARGE_COLUMN_SIZE_ROLES,
  TakeChargeDataTable,
  TakeChargeDetailContent,
} from "@/features/goals/take-charge-data-table";
import type { NormalizedTakeChargeRecord } from "@/data/contracts/take-charge";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import {
  formatBusinessDate,
  formatBusinessDateTime,
} from "@/lib/format-business-date-time";

const record: NormalizedTakeChargeRecord = {
  storeId: "TEST-001",
  storeDisplayName: "测试门店",
  tchId: "TCH-1842753",
  submittedBy: "测试员工",
  submittedAt: "2026-09-11T09:42:00+08:00",
  summary: "完整的 Take Charge 建议摘要",
  sourceStatus: "PendingReview",
  recordState: "OPEN",
  extraFields: {},
};

describe("Take Charge Data Table contract", () => {
  it("defaults to Current Open", () => {
    expect(DEFAULT_TAKE_CHARGE_VIEW_MODE).toBe("OPEN_ONLY");
  });

  it("resets repository pagination when view mode or sorting changes", () => {
    expect(resetTakeChargePageIndex({ pageIndex: 3, pageSize: 7 })).toEqual({
      pageIndex: 0,
      pageSize: 7,
    });
  });

  it("uses stable record identity across repository pages", () => {
    const firstPageRow = {
      ...record,
      tchId: "TCH-1111111",
      sourceStatus: "Declined",
      recordState: "CLOSED" as const,
    };
    const secondPageRow = {
      ...record,
      tchId: "TCH-2222222",
      sourceStatus: "InProgress",
      recordState: "OPEN" as const,
    };

    expect(getTakeChargeRowId(firstPageRow)).toBe("TCH-1111111");
    expect(getTakeChargeRowId(secondPageRow)).toBe("TCH-2222222");
    expect(getTakeChargeRowId(firstPageRow)).not.toBe(
      getTakeChargeRowId(secondPageRow),
    );
  });

  it("keeps only the six core columns visible by default", () => {
    expect(DEFAULT_VISIBLE_TAKE_CHARGE_COLUMN_IDS).toEqual([
      "store",
      "tchId",
      "submittedBy",
      "submittedAt",
      "summary",
      "status",
    ]);
  });

  it("declares semantic sizing roles for core columns", () => {
    expect(TAKE_CHARGE_COLUMN_SIZE_ROLES).toEqual({
      store: "primary",
      tchId: "compact",
      submittedBy: "standard",
      submittedAt: "compact",
      summary: "content",
      status: "standard",
    });
  });

  it("reuses sortable headers for core fields but not Summary", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(TakeChargeDataTable, {
          context: {
            region: { kind: "ALL" },
            area: { kind: "ALL" },
            store: { kind: "ALL" },
            period: periodFromMonthRange("2026-09", "2026-09")!,
          },
          repository: {
            getTakeChargeRecords: () => {
              throw new Error("not called before measurement");
            },
          },
        }),
      ),
    );

    expect(markup).toContain("门店: 未排序");
    expect(markup).toContain("TCH 编号: 未排序");
    expect(markup).toContain("提交人: 未排序");
    expect(markup).toContain("提交时间: 未排序");
    expect(markup).toContain("状态: 未排序");
    expect(markup).not.toContain("摘要: 未排序");
  });

  it("renders the complete core detail without TRTID", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(TakeChargeDetailContent, { record }),
      ),
    );

    expect(markup).toContain("测试门店");
    expect(markup).toContain("TCH-1842753");
    expect(markup).toContain("完整的 Take Charge 建议摘要");
    expect(markup).toContain("PendingReview");
    expect(markup).not.toContain("TEST-001");
    expect(markup).toContain("2026-09-11 09:42");
    expect(markup).not.toContain("09:42:00");
  });

  it("formats the same normalized datetime for compact table and full detail", () => {
    expect(formatBusinessDate(record.submittedAt)).toBe("2026-09-11");
    expect(formatBusinessDateTime(record.submittedAt)).toBe(
      "2026-09-11 09:42",
    );
  });

  it("formats timezone-aware values in Asia/Shanghai instead of slicing text", () => {
    expect(formatBusinessDate("2026-09-22T16:15:00Z")).toBe(
      "2026-09-23",
    );
    expect(formatBusinessDateTime("2026-09-22T16:15:00Z")).toBe(
      "2026-09-23 00:15",
    );
  });
});
