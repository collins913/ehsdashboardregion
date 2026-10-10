import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { loadCertificatesPageData } from "./certificates-page-content";
import { CertificatesDataTable, CertificatesDetailContent } from "./certificates-data-table";
import { buildCertificatesDetail, CERTIFICATES_ITEMS, certificatesQueryKey, toCertificatesTableRows, groupCertificateRecords } from "./certificates-view-model";
import { CERTIFICATE_TYPE_CATEGORIES } from "@/lib/rules/certificate-types";
import type { CertificatesStoreRow, NormalizedCertificateRecord } from "@/data/contracts/certificates";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { EhsFilterContext } from "@/data/contracts/kpi";

const certificate: NormalizedCertificateRecord = {
  storeId: "canonical-not-trtid", storeDisplayName: "中文门店", certificateCategory: "安全健康",
  certificateType: "主要负责人安全生产培训合格证书-S", person: "测试人员", personEmail: "person@example.test",
  businessTitle: "测试岗位", expiryDate: "2026-09-10", daysUntilExpiry: -5, certificateStatus: "ABNORMAL", certificateReason: "EXPIRED",
};
const row: CertificatesStoreRow = { storeId: certificate.storeId, storeDisplayName: certificate.storeDisplayName,
  categories: CERTIFICATES_ITEMS.map(({ label }) => ({ certificateCategory: label, status: "ABNORMAL", reason: "RULE_NOT_MET", records: label === "安全健康" ? [certificate] : [] })) };
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
    expect(detail.status).toBe("ABNORMAL");
    const expectedTypes = Object.entries(CERTIFICATE_TYPE_CATEGORIES).filter(([, category]) => category === label).map(([type]) => type);
    expect(detail.groups.map((group) => group.certificateType)).toEqual(expectedTypes);
    if (key === "safetyHealth") {
      expect(detail.groups[0].records).toEqual([certificate]);
      expect(detail.groups[0].count).toBe(1);
      expect(detail.groups[0].hasAbnormalRecords).toBe(true);
      expect((html.match(/aria-label="需要关注"/g) ?? []).length).toBe(1);
      expect(html).not.toContain("bg-destructive");
    } else {
      expect(detail.groups.every((group) => group.count === 0 && group.disabled && !group.hasAbnormalRecords)).toBe(true);
      expect((html.match(/>0<\/span>/g) ?? []).length).toBe(expectedTypes.length);
    }
    expect(html).not.toContain(certificate.person); // Record content stays inside initially collapsed panels.
    expect(html).not.toMatch(/Required Slot|即将到期|TRTID|UNDETERMINED/);
  });
  it("prepares multiple records and retains evaluated status and day values", () => {
    const detail = { storeDisplayName: "中文门店", certificateCategory: "安全健康" as const, status: "ABNORMAL" as const,
      records: [{ ...certificate, expiryDate: null, daysUntilExpiry: null }, { ...certificate, certificateStatus: "NORMAL" as const, daysUntilExpiry: 0 }] };
    const groups = groupCertificateRecords(detail.certificateCategory, detail.records);
    expect(groups[0].records).toEqual(detail.records);
    expect(groups[0].count).toBe(2);
    expect(groups[0].disabled).toBe(false);
    expect(groups[0].hasAbnormalRecords).toBe(true);
    expect(groups[0].records[0].daysUntilExpiry).toBeNull();
    expect(groups[0].records[1].daysUntilExpiry).toBe(0);
  });
  it("keeps normalized category status rather than recomputing it", () => {
    const supplied = { ...row, categories: row.categories.map((category) => ({ ...category, status: "NORMAL" as const })) };
    expect(toCertificatesTableRows([supplied])[0].safetyHealth).toBe("NORMAL");
  });
  it("builds all official Type groups in taxonomy order and preserves every matching record", () => {
    const second = { ...certificate, person: "第二位人员" };
    const h1 = { ...certificate, certificateType: "主要负责人职业卫生培训合格证书-H1", certificateStatus: "NORMAL" as const, certificateReason: "NORMAL" as const };
    const records = Object.freeze([Object.freeze(certificate), Object.freeze(h1), Object.freeze(second)]);
    const groups = groupCertificateRecords("安全健康", records);
    expect(groups.map((group) => group.certificateType)).toEqual(
      Object.entries(CERTIFICATE_TYPE_CATEGORIES).filter(([, category]) => category === "安全健康").map(([type]) => type),
    );
    expect(groups[0].records).toEqual([certificate, second]);
    expect(groups[0].count).toBe(2);
    expect(groups[0].disabled).toBe(false);
    expect(groups[0].hasAbnormalRecords).toBe(true);
    expect(groups[1].count).toBe(0);
    expect(groups[1].disabled).toBe(true);
    expect(groups[1].hasAbnormalRecords).toBe(false);
    expect(groups[2].records).toEqual([h1]);
    expect(groups[2].hasAbnormalRecords).toBe(false);
    expect(groups.flatMap((group) => group.records)).toHaveLength(records.length);
  });
  it("renders every formal Type as a collapsed Accordion and keeps records in their prepared groups", () => {
    const records = [
      certificate,
      { ...certificate, person: "同类型第二位", personEmail: "second@example.test" },
    ];
    const supplied = { ...row, categories: row.categories.map((category) => category.certificateCategory === "安全健康" ? { ...category, records } : category) };
    const detail = buildCertificatesDetail(toCertificatesTableRows([supplied])[0], "safetyHealth");
    const html = renderToStaticMarkup(createElement(CertificatesDetailContent, { detail }));
    expect(html).not.toContain("<table");
    expect((html.match(/data-slot="accordion-item"/g) ?? []).length).toBe(4);
    expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(4);
    expect((html.match(/data-disabled="" data-orientation="vertical" data-slot="accordion-item"/g) ?? []).length).toBe(3);
    expect(html).toContain(certificate.certificateType);
    expect(html).toContain("安全生产管理人员安全生产培训合格证书-M");
    expect(html).toContain("主要负责人职业卫生培训合格证书-H1");
    expect(html).toContain("职业卫生管理人员职业卫生培训合格证书-H2");
    expect(html).not.toContain("同类型第二位");
    expect(detail.groups[0].records).toHaveLength(2);
    expect(detail.groups[0].records[1].personEmail).toBe("second@example.test");
    expect((html.match(/aria-label="需要关注"/g) ?? []).length).toBe(1);
  });
  it("displays supplied status and days even if they disagree with the displayed date", () => {
    const records = [{ ...certificate, expiryDate: "1900-01-01", certificateStatus: "NORMAL" as const, daysUntilExpiry: 128 }];
    const detail = { storeDisplayName: "中文门店", certificateCategory: "安全健康" as const, status: "ABNORMAL" as const, records, groups: groupCertificateRecords("安全健康", records) };
    const groups = groupCertificateRecords(detail.certificateCategory, records);
    expect(groups[0].hasAbnormalRecords).toBe(false);
    expect(groups[0].records[0].certificateStatus).toBe("NORMAL");
    expect(groups[0].records[0].expiryDate).toBe("1900-01-01");
    expect(groups[0].records[0].daysUntilExpiry).toBe(128);
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
    for (const file of ["certificates-page-content.tsx", "certificates-data-table.tsx"]) {
      const source = readFileSync("src/features/certificates/" + file, "utf8");
      expect(source).not.toMatch(/@\/data\/mock|@\/lib\/rules|evaluateCertificate|Date\.now|Date\.parse/);
    }
    const viewModel = readFileSync("src/features/certificates/certificates-view-model.ts", "utf8");
    expect(viewModel).toContain("CERTIFICATE_TYPE_CATEGORIES");
    expect(viewModel).not.toMatch(/evaluateCertificate|Date\.now|Date\.parse/);
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
