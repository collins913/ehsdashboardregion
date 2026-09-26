import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { loadCertificatesPageData } from "./certificates-page-content";
import { CertificatesDataTable, CertificatesDetailContent } from "./certificates-data-table";
import { buildCertificatesDetail, CERTIFICATES_ITEMS, certificatesQueryKey, toCertificatesTableRows, groupCertificateRecords } from "./certificates-view-model";
import type { CertificatesStoreRow, NormalizedCertificateRecord } from "@/data/contracts/certificates";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";

const certificate: NormalizedCertificateRecord = {
  storeId: "canonical-not-trtid", storeDisplayName: "中文门店", certificateCategory: "安全健康",
  certificateType: "主要负责人安全生产培训合格证书-S", person: "测试人员", personEmail: "person@example.test",
  businessTitle: "测试岗位", expiryDate: "2026-09-10", daysUntilExpiry: -5, certificateStatus: "ABNORMAL", certificateReason: "EXPIRED",
};
const row: CertificatesStoreRow = { storeId: certificate.storeId, storeDisplayName: certificate.storeDisplayName,
  categories: CERTIFICATES_ITEMS.map(({ label }) => ({ certificateCategory: label, status: "ABNORMAL", records: label === "安全健康" ? [certificate] : [] })) };
const tableRow = toCertificatesTableRows([row])[0];
const context: EhsFilterContext = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" }, period: periodFromMonthRange("2026-07", "2026-09")! };

describe("Certificates V1 feature", () => {
  it("uses the injected Server Action envelope and skips unresolved filter contexts", async () => {
    const pageResult = { availability: "AVAILABLE" as const, items: [row] as const, unknownTypeRecords: [], overview: { items: [], groups: [] } };
    const query = vi.fn(async () => pageResult);
    expect(await loadCertificatesPageData(context, "reference", query)).toEqual(pageResult);
    expect(query).toHaveBeenCalledWith({ referenceDateIso: "reference", query: context });
    query.mockClear();
    expect(await loadCertificatesPageData(null, "reference", query)).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
  it.each(CERTIFICATES_ITEMS)("uses one detail context for $label", ({ key, label }) => {
    const detail = buildCertificatesDetail(tableRow, key);
    expect(detail.certificateCategory).toBe(label);
    expect(detail.status).toBe("ABNORMAL");
    expect(detail.storeDisplayName).toBe("中文门店");
    const html = renderToStaticMarkup(createElement(CertificatesDetailContent, { detail }));
    expect(html).toContain("异常");
    if (key === "safetyHealth") {
      for (const text of [certificate.person, certificate.personEmail, certificate.businessTitle, certificate.certificateType, "-5 天"]) expect(html).toContain(text);
    } else expect(html).toContain("当前分类暂无证件记录");
    expect(html).not.toMatch(/Required Slot|即将到期|TRTID|UNDETERMINED/);
  });
  it("renders null days as an em dash and record status independently", () => {
    const detail = { storeDisplayName: "中文门店", certificateCategory: "安全健康" as const, status: "ABNORMAL" as const,
      records: [{ ...certificate, expiryDate: null, daysUntilExpiry: null }, { ...certificate, certificateStatus: "NORMAL" as const, daysUntilExpiry: 0 }] };
    const presentation = { ...detail, groups: groupCertificateRecords(detail.records) };
    const html = renderToStaticMarkup(createElement(CertificatesDetailContent, { detail: presentation }));
    expect(html).toContain("—"); expect(html).toContain("正常"); expect(html).toContain("异常"); expect(html).toContain("0 天");
  });
  it("keeps normalized category status rather than recomputing it", () => {
    const supplied = { ...row, categories: row.categories.map((category) => ({ ...category, status: "NORMAL" as const })) };
    expect(toCertificatesTableRows([supplied])[0].safetyHealth).toBe("NORMAL");
  });
  it("groups actual Types in first-seen order without dropping duplicate records or mutating input", () => {
    const second = { ...certificate, person: "第二位人员" };
    const future = { ...certificate, certificateType: "新的安全健康证书-X" };
    const records = Object.freeze([Object.freeze(certificate), Object.freeze(future), Object.freeze(second), Object.freeze({ ...future })]);
    const groups = groupCertificateRecords(records);
    expect(groups.map((group) => group.certificateType)).toEqual([certificate.certificateType, future.certificateType]);
    expect(groups[0].records).toEqual([certificate, second]);
    expect(groups[1].records).toHaveLength(2);
    expect(groups.flatMap((group) => group.records)).toHaveLength(records.length);
    expect(groupCertificateRecords([])).toEqual([]);
  });
  it("renders future normalized Types and all records vertically without a records Table", () => {
    const records = [
      certificate,
      { ...certificate, certificateType: "新的安全健康证书-X", person: "未来人员" },
      { ...certificate, person: "同类型第二位", personEmail: "second@example.test" },
    ];
    const supplied = { ...row, categories: row.categories.map((category) => category.certificateCategory === "安全健康" ? { ...category, records } : category) };
    const detail = buildCertificatesDetail(toCertificatesTableRows([supplied])[0], "safetyHealth");
    const html = renderToStaticMarkup(createElement(CertificatesDetailContent, { detail }));
    expect(html).not.toContain("<table");
    expect((html.match(/<section /g) ?? []).length).toBe(2);
    expect((html.match(/data-slot="card"/g) ?? []).length).toBe(3);
    for (const value of ["新的安全健康证书-X", "未来人员", "同类型第二位", "second@example.test", certificate.expiryDate!]) expect(html).toContain(value);
    expect(html.split(certificate.certificateType)).toHaveLength(2); // once as section heading, not in each card
    const content = readFileSync("src/features/certificates/certificates-data-table.tsx", "utf8").split("export function CertificatesDataTable")[0];
    expect(content).toContain("detail.groups.map");
    expect(content).toContain("group.records.map");
    expect(content).not.toMatch(/主要负责人|安全驾驶内|S\/M\/H1\/H2|switch\(|Object\.keys/);
  });
  it("displays supplied status and days even if they disagree with the displayed date", () => {
    const records = [{ ...certificate, expiryDate: "1900-01-01", certificateStatus: "NORMAL" as const, daysUntilExpiry: 128 }];
    const detail = { storeDisplayName: "中文门店", certificateCategory: "安全健康" as const, status: "ABNORMAL" as const, records, groups: groupCertificateRecords(records) };
    const html = renderToStaticMarkup(createElement(CertificatesDetailContent, { detail }));
    expect(html).toContain("正常"); expect(html).toContain("异常");
    expect(html).toContain("1900-01-01"); expect(html).toContain("128 天");
  });
  it("renders five sortable columns using the existing table layout", () => {
    const html = renderToStaticMarkup(createElement(CertificatesDataTable, { rows: [tableRow], queryKey: "scope", queryStatus: "READY" }));
    for (const label of ["门店", ...CERTIFICATES_ITEMS.map((item) => item.label)]) expect(html).toContain(label + ": 未排序");
    expect(html).toContain("table-fixed"); expect(html).toContain("列显示"); expect(html).toContain("data-adaptive-table-measurement-row");
  });
  it("excludes Period from query identity but includes semantic Store scope", () => {
    const otherPeriod = { ...context, period: periodFromMonthRange("2030-01", "2030-02")! };
    expect(certificatesQueryKey(otherPeriod, "reference")).toBe(certificatesQueryKey(context, "reference"));
    expect(certificatesQueryKey({ ...context, store: { kind: "INCLUDE", values: ["canonical"] } }, "reference")).not.toBe(certificatesQueryKey(context, "reference"));
  });
  it("uses shared async pending and leaves rules and Mock outside UI", () => {
    for (const file of ["certificates-page-content.tsx", "certificates-data-table.tsx", "certificates-view-model.ts"]) {
      const source = readFileSync("src/features/certificates/" + file, "utf8");
      expect(source).not.toMatch(/@\/data\/mock|@\/lib\/rules|evaluateCertificate|Date\.now|Date\.parse/);
    }
    const page = readFileSync("src/features/certificates/certificates-page-content.tsx", "utf8");
    expect(page).toContain("useLatestAsyncQuery(queryKey");
    expect(page).toContain("state.resolved?.data");
    const table = readFileSync("src/features/certificates/certificates-data-table.tsx", "utf8");
    for (const helper of ["useResolvedDataTableSnapshot", "useRetainedDataTableRows", "pendingMode={pendingMode}", "TableCellTrigger", "OverflowTooltip", "StatusDisplay"]) expect(table).toContain(helper);
    expect(table).not.toMatch(/setAdaptivePagination\(null\)|key=\{queryKey\}/);
    const route = readFileSync("src/app/(dashboard)/risk/certificates/page.tsx", "utf8");
    expect(route).not.toMatch(/PageHeader|GlobalFilters|PlaceholderPage/);
  });
});
