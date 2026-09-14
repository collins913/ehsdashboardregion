import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NormalizedStoreRecord } from "@/data/contracts/stores";
import {
  DEFAULT_VISIBLE_STORE_COLUMN_IDS,
  getStoreRowId,
  isStoreRowActivationKey,
  STORE_COLUMN_SIZE_ROLES,
  StoreDetailContent,
  StoresDataTable,
} from "@/features/stores/stores-data-table";

const record: NormalizedStoreRecord = {
  storeId: "TEST-001",
  storeNameCn: "测试中文门店",
  storeNameEn: "Test English Store",
  trtid: "TEST-001",
  region: "测试区域",
  area: "测试小区",
  manager: "测试经理",
  ehsAmbassador: "测试代表",
};

describe("Stores Data Table contract", () => {
  it("shows the six confirmed columns by default", () => {
    expect(DEFAULT_VISIBLE_STORE_COLUMN_IDS).toEqual([
      "store",
      "region",
      "area",
      "trtid",
      "manager",
      "ehsAmbassador",
    ]);
  });

  it("declares semantic sizing roles for Store Master fields", () => {
    expect(STORE_COLUMN_SIZE_ROLES).toEqual({
      store: "primary",
      region: "standard",
      area: "standard",
      trtid: "compact",
      manager: "standard",
      ehsAmbassador: "standard",
    });
  });

  it("uses canonical storeId as stable row identity", () => {
    expect(getStoreRowId(record)).toBe("TEST-001");
  });

  it("uses the existing row keyboard activation keys", () => {
    expect(isStoreRowActivationKey("Enter")).toBe(true);
    expect(isStoreRowActivationKey(" ")).toBe(true);
    expect(isStoreRowActivationKey("Escape")).toBe(false);
  });

  it("reuses sortable headers and adaptive pagination measurement", () => {
    const markup = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(StoresDataTable, { rows: [record] }),
      ),
    );

    expect(markup).toContain("门店: 未排序");
    expect(markup).toContain("区域: 未排序");
    expect(markup).toContain("小区: 未排序");
    expect(markup).toContain("TRTID: 未排序");
    expect(markup).toContain("门店经理: 未排序");
    expect(markup).toContain("EHS&amp;S 代表: 未排序");
    expect(markup).toContain("列显示");
    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).not.toContain("测试中文门店");
  });
});

describe("Store detail", () => {
  it("renders all seven confirmed fields with the Chinese EHS&S label", () => {
    const markup = renderToStaticMarkup(
      createElement(StoreDetailContent, { record }),
    );

    expect(markup).toContain("测试中文门店");
    expect(markup).toContain("Test English Store");
    expect(markup).toContain("TEST-001");
    expect(markup).toContain("测试区域");
    expect(markup).toContain("测试小区");
    expect(markup).toContain("测试经理");
    expect(markup).toContain("测试代表");
    expect(markup).toContain("EHS&amp;S 代表");
  });

  it("uses the project empty-value display without changing the contract", () => {
    const markup = renderToStaticMarkup(
      createElement(StoreDetailContent, {
        record: { ...record, manager: "" },
      }),
    );

    expect(markup).toContain("—");
  });
});
