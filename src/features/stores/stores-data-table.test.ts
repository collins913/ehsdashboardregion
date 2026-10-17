import { STORE_FIELD_DEFINITIONS, storeFieldDefinitions, storeFieldColumnId } from "@/data/contracts/store-fields";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NormalizedStoreRecord } from "@/data/contracts/stores";
import {
  DEFAULT_VISIBLE_STORE_COLUMN_IDS,
  defaultStoreColumnVisibility,
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
  regionOwner: "测试区域负责人",
  regionOwnerEmail: "region@example.test",
  areaOwner: "测试小区负责人",
  areaOwnerEmail: "area@example.test",
  manager: "测试经理",
  managerEmail: "manager@example.test",
  ehsAmbassador: "测试代表",
  ehsAmbassadorEmail: "ehss@example.test",
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


  it("offers contact and source extension columns while keeping only the original five optional columns visible", () => {
    const fields = storeFieldDefinitions([{ ...record, extraFields: { 门店性质: "直营", 停车位: 8, 已开业: false } }]);
    const visibility = defaultStoreColumnVisibility(fields);
    expect(fields).toContainEqual({ key: "regionOwner", label: "区域负责人", source: "record" });
    expect(fields).toContainEqual({ key: "areaOwner", label: "小区负责人", source: "record" });
    expect(Object.keys(visibility).filter((id) => visibility[id])).toEqual(["region", "area", "trtid", "manager", "ehsAmbassador"]);
    for (const id of ["regionOwner", "areaOwner", "regionOwnerEmail", "storeNameEn", "extra:门店性质", "extra:停车位", "extra:已开业"]) expect(visibility[id]).toBe(false);
    expect(fields.map(storeFieldColumnId)).not.toContain("storeId");
    expect(fields.map(storeFieldColumnId)).not.toContain("extraFields");
    expect(defaultStoreColumnVisibility([...STORE_FIELD_DEFINITIONS, { key: "新增字段", label: "新增字段", source: "extra" }])["extra:新增字段"]).toBe(false);
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
    expect(markup).not.toContain("区域负责人: 未排序");
    expect(markup).not.toContain("小区负责人: 未排序");
    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).not.toContain("测试中文门店");
  });
});

describe("Store detail", () => {
  it("renders all four contacts and their emails without repeating the Header store name", () => {
    const markup = renderToStaticMarkup(
      createElement(StoreDetailContent, { record }),
    );

    expect(markup).not.toContain("测试中文门店");
    expect(markup).toContain("Test English Store");
    expect(markup).toContain("TEST-001");
    expect(markup).toContain("测试区域");
    expect(markup).toContain("测试小区");
    expect(markup).toContain("测试经理");
    expect(markup).toContain("测试区域负责人");
    expect(markup).toContain("region@example.test");
    expect(markup).toContain("测试小区负责人");
    expect(markup).toContain("area@example.test");
    expect(markup).toContain("manager@example.test");
    expect(markup).toContain("测试代表");
    expect(markup).toContain("ehss@example.test");
    expect(markup).toContain("EHS&amp;S 代表");
  });

  it("uses the project empty-value display without changing the contract", () => {
    const markup = renderToStaticMarkup(
      createElement(StoreDetailContent, {
        record: { ...record, regionOwner: null, areaOwnerEmail: null, manager: null, managerEmail: null, ehsAmbassador: null, ehsAmbassadorEmail: null },
      }),
    );

    expect(markup).toContain("—");
    expect(markup).not.toContain("null");
    expect(markup).not.toContain("undefined");
  });
  it("displays source extension values without dropping zero or false", () => {
    const markup = renderToStaticMarkup(createElement(StoreDetailContent, { record: { ...record, extraFields: { 门店性质: "直营", 停车位: 0, 已搬迁: false } } }));
    expect(markup).toContain("门店性质");
    expect(markup).toContain("直营");
    expect(markup).toContain("停车位");
    expect(markup).toContain(">0<");
    expect(markup).toContain(">false<");
  });

});
