import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EnvironmentDataTable } from "./environment-data-table";
import { EnvironmentDetailContent } from "./environment-detail-sheet";
import {
  buildEnvironmentDetail,
  ENVIRONMENT_DETAILS,
  environmentQueryKey,
} from "./environment-view-model";
import { EmergencyPlanDetail } from "./details/emergency-plan-detail";
import { EnvironmentalLicensesDetail } from "./details/environmental-licenses-detail";
import { WasteContractsDetail } from "./details/waste-contracts-detail";
import { loadEnvironmentPageData } from "./environment-page-content";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";

const record: NormalizedEnvironmentRecord = {
  storeId: "canonical-not-trtid",
  storeDisplayName: "中文门店",
  facilityInformation: null,
  environmentalLicenses: {
    environmentalImpactAssessment: {
      assessmentText: "自定义环评说明",
      totalRequirements: {
        airParticulate: 1.25,
        airVocs: null,
        waterAmmoniaNitrogen: 0.3,
        waterTotalNitrogen: 0.7,
        waterTotalPhosphorus: 0.2,
        waterCodCr: 3.5,
      },
    },
    dischargePermit: {
      permitText: "自定义排污许可说明",
      executionReport: "自由文本执行报告",
      permitNumber: "P-001",
      validFrom: "2026-01-01",
      validTo: "2030-12-31",
      totalRequirements: { productionCapacity: "源值 1200", approvedCoatingUsage: 80 },
      remarks: "排污许可备注",
    },
    drainagePermit: {
      carWash: "设有洗车工位",
      drainagePermitText: "自定义排水许可说明",
      validFrom: "2026-03-01",
      validTo: "2029-02-28",
      remarks: "排水许可备注",
    },
  },
  emergencyPlan: {
    filingStatus: "已完成属地备案",
    filingNumber: "ERP-001",
    validFrom: "2026-05-01",
    validTo: "2029-04-30",
    remarks: "应急预案备注",
  },
  monitoring: { monitoringText: "有" },
  wasteContracts: {
    hazardousWaste: [
      { supplierName: "重复供应商", wasteType: "废活性炭", validFrom: "2026-01-01", validTo: "2027-01-01" },
      { supplierName: "重复供应商", wasteType: "废活性炭", validFrom: "2026-01-01", validTo: "2027-01-01" },
      { supplierName: "第三供应商", wasteType: "废油漆渣", validFrom: null, validTo: null },
    ],
    generalIndustrialSolidWaste: [],
  },
};
const context: EhsFilterContext = {
  region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" },
  period: periodFromMonthRange("2026-07", "2026-09")!,
};

describe("Environment detail feature", () => {
  it("defines the final Store plus five detail-entry columns", () => {
    expect(ENVIRONMENT_DETAILS).toEqual([
      { kind: "facility", label: "设施信息" },
      { kind: "environmentalLicenses", label: "环保证照" },
      { kind: "emergencyPlan", label: "应急预案" },
      { kind: "monitoring", label: "监测" },
      { kind: "wasteContracts", label: "废弃物合同" },
    ]);
    const source = readFileSync("src/features/environment/environment-data-table.tsx", "utf8");
    expect(source).toContain("...ENVIRONMENT_DETAILS.map");
    expect(source).toContain("columnHelper.display");
    expect(source).toContain("<TableCellTrigger");
    expect(source).toContain("查看\n");
    expect(source).not.toMatch(/EnvironmentValue|Badge|environmentalImpactAssessment.*accessor/);
  });

  it.each(ENVIRONMENT_DETAILS)("routes $label through one typed detail union", ({ kind, label }) => {
    const detail = buildEnvironmentDetail(record, kind);
    expect(detail.kind).toBe(kind);
    expect(detail.label).toBe(label);
    expect(detail.storeDisplayName).toBe("中文门店");
    expect(renderToStaticMarkup(createElement(EnvironmentDetailContent, { detail }))).not.toBe("");
  });

  it("renders one Accordion with the three environmental-license sections and explicit EIA fields", () => {
    const markup = renderToStaticMarkup(createElement(EnvironmentalLicensesDetail, record.environmentalLicenses));
    for (const heading of ["环境影响评价", "排污许可", "排水许可"]) expect(markup).toContain(heading);
    for (const field of ["气-颗粒物", "气-VOCs", "水-氨氮", "水-总氮", "水-总磷", "水-CODcr"]) expect(markup).toContain(field);
    expect(markup).toContain("自定义环评说明");
    expect(markup).toContain("1.25 吨/年");
    expect(markup).toContain("—");
    expect(markup).toContain('data-slot="accordion"');

    const source = readFileSync("src/features/environment/details/environmental-licenses-detail.tsx", "utf8");
    for (const field of ["执行报告", "编号", "产能", "涂料批复用量", "洗车", "有效期起", "有效期止", "备注"]) expect(source).toContain(field);
    expect(source).not.toMatch(/NORMAL|ABNORMAL|daysUntilExpiry|referenceDate/);
  });

  it("renders exactly the five confirmed Emergency Plan fields", () => {
    const markup = renderToStaticMarkup(createElement(EmergencyPlanDetail, { emergencyPlan: record.emergencyPlan }));
    for (const field of ["突发环境事件应急预案备案情况", "备案编号", "有效期起", "有效期止", "备注"]) expect(markup).toContain(field);
    expect((markup.match(/<dt /g) ?? []).length).toBe(5);
    expect(markup).toContain("已完成属地备案");
  });

  it("keeps Facility as TBD and Monitoring to its existing known value", () => {
    const facility = renderToStaticMarkup(createElement(EnvironmentDetailContent, { detail: buildEnvironmentDetail(record, "facility") }));
    const monitoring = renderToStaticMarkup(createElement(EnvironmentDetailContent, { detail: buildEnvironmentDetail(record, "monitoring") }));
    expect(facility).toContain("设施信息");
    expect(facility).toContain("详情字段待定义");
    expect(monitoring).toContain("当前监测信息");
    expect(monitoring).toContain("有");
    expect(monitoring).toContain("详情字段待定义");
    expect(monitoring).not.toMatch(/机构|频次|监测日期|检测结果|合格|不合格/);
  });

  it("renders zero and every repeated Waste Contract without Accordion, dedupe or limit", () => {
    const markup = renderToStaticMarkup(createElement(WasteContractsDetail, record.wasteContracts));
    expect(markup).toContain("危险废物处置合同");
    expect(markup).toContain("一般工业固体废物处置合同");
    expect(markup).toContain("当前暂无合同记录");
    expect((markup.match(/重复供应商/g) ?? []).length).toBe(2);
    expect(markup).toContain("第三供应商");
    expect(markup).not.toContain('data-slot="accordion"');
    const source = readFileSync("src/features/environment/details/waste-contracts-detail.tsx", "utf8");
    expect(source).toContain("contracts.map");
    expect(source).not.toMatch(/slice\(|sort\(|dedup|limit/i);
  });

  it("renders zero, one and many records independently for both Waste Contract categories", () => {
    const contract = record.wasteContracts.hazardousWaste[0]!;
    for (const [hazardousCount, generalCount] of [[0, 1], [1, 3], [3, 0]] as const) {
      const markup = renderToStaticMarkup(createElement(WasteContractsDetail, {
        hazardousWaste: Array.from({ length: hazardousCount }, () => contract),
        generalIndustrialSolidWaste: Array.from({ length: generalCount }, () => contract),
      }));
      expect((markup.match(/供应商名称/g) ?? []).length).toBe(hazardousCount + generalCount);
      expect((markup.match(/当前暂无合同记录/g) ?? []).length).toBe(Number(hazardousCount === 0) + Number(generalCount === 0));
    }
  });

  it("retains the shared fixed table, visibility, adaptive row and stable loading presentation", () => {
    const markup = renderToStaticMarkup(createElement(EnvironmentDataTable, { rows: [record], queryKey: "scope", queryStatus: "READY" }));
    expect(markup).toContain("列显示");
    expect(markup).toContain("data-adaptive-table-measurement-row");
    expect(markup).toContain("table-fixed");
    const source = readFileSync("src/features/environment/environment-data-table.tsx", "utf8");
    expect(source).toContain("useResolvedDataTableSnapshot");
    expect(source).toContain("useRetainedDataTableRows");
    expect(source).toContain("pendingMode={pendingMode}");
    expect(source).toContain('pendingMode === "mask-content"');
    expect(source).not.toMatch(/setAdaptivePagination\(null\)|key=\{queryKey\}/);
  });

  it("uses the server query envelope without loading Mock in Feature UI", async () => {
    const query = vi.fn(async () => ({ availability: "AVAILABLE" as const, items: [record] as const }));
    await loadEnvironmentPageData(context, "reference", query);
    expect(query).toHaveBeenCalledWith({ referenceDateIso: "reference", query: context });
    query.mockClear();
    expect(await loadEnvironmentPageData(null, "reference", query)).toBeNull();
    expect(query).not.toHaveBeenCalled();

    const files = [
      ...readdirSync("src/features/environment", { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && entry.name !== "environment.test.tsx")
        .map((entry) => `src/features/environment/${entry.name}`),
      ...readdirSync("src/features/environment/details")
        .filter((name) => /\.tsx?$/.test(name))
        .map((name) => `src/features/environment/details/${name}`),
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/@\/data\/mock|createMockEhsRepository|@\/data\/server/);
      expect(source).not.toMatch(/NORMAL|ABNORMAL|daysUntilExpiry|Date\.now|new Date\(/);
    }
  });

  it("does not change query identity on Period change but does on Store change", () => {
    const otherPeriod = { ...context, period: periodFromMonthRange("2030-01", "2030-02")! };
    expect(environmentQueryKey(otherPeriod)).toBe(environmentQueryKey(context));
    expect(environmentQueryKey({ ...context, store: { kind: "INCLUDE", values: [record.storeId] } })).not.toBe(environmentQueryKey(context));
  });

  it("routes through the persistent shell", () => {
    const route = readFileSync("src/app/(dashboard)/risk/environment/page.tsx", "utf8");
    expect(route).toContain("queryEnvironment={queryEnvironment}");
    expect(route).not.toMatch(/PageHeader|GlobalFilters|PlaceholderPage/);
    const page = readFileSync("src/features/environment/environment-page-content.tsx", "utf8");
    expect(page).not.toMatch(/DataAvailabilityDisplay|数据不完整/);
    expect(page).toContain("useLatestAsyncQuery(queryKey");
    expect(page).toContain("state.resolved?.data");
  });
});
