import { describe, expect, it } from "vitest";
import type {
  CertificatesQueryResult,
  CertificatesStoreRow,
  NormalizedCertificateRecord,
} from "@/data/contracts/certificates";
import { buildCertificateOverview, CERTIFICATE_REQUIREMENTS } from "./certificate-requirements";
import { CERTIFICATE_CATEGORIES, CERTIFICATE_OVERVIEW_TYPE_DISPLAY, CERTIFICATE_TYPE_CATEGORIES } from "./certificate-types";

const safeHealthType = "主要负责人安全生产培训合格证书-S";
const firstAidType = "急救员证";
const unconfiguredType = "熔化焊接与热切割作业";

function record(certificateType: string, storeId: string): NormalizedCertificateRecord {
  return {
    storeId,
    storeDisplayName: storeId,
    certificateCategory: certificateType === firstAidType ? "急救员" : certificateType === unconfiguredType ? "特种作业" : "安全健康",
    certificateType,
    person: "员工",
    personEmail: "employee@example.test",
    businessTitle: "员工",
    expiryDate: "2026-01-01",
    daysUntilExpiry: -1,
    certificateStatus: "ABNORMAL",
    certificateReason: "EXPIRED",
  };
}

function store(storeId: string, records: readonly NormalizedCertificateRecord[] = []): CertificatesStoreRow {
  return {
    storeId,
    storeDisplayName: storeId,
    categories: ["安全健康", "急救员", "特种作业", "安全驾驶"].map((certificateCategory) => ({
      certificateCategory: certificateCategory as CertificatesStoreRow["categories"][number]["certificateCategory"],
      status: records.some((item) => item.certificateCategory === certificateCategory && item.certificateStatus === "ABNORMAL") ? "ABNORMAL" : "NORMAL",
      records: records.filter((item) => item.certificateCategory === certificateCategory),
    })),
  };
}

function queryResult(stores: readonly CertificatesStoreRow[]): CertificatesQueryResult {
  if (stores.length === 0) return { availability: "CONFIRMED_EMPTY", items: [], unknownTypeRecords: [] };
  return { availability: "AVAILABLE", items: stores as readonly [CertificatesStoreRow, ...CertificatesStoreRow[]], unknownTypeRecords: [] };
}

describe("Certificate Overview requirements and actual counts", () => {
  it("calculates per-store requirements for one store", () => {
    const result = buildCertificateOverview(queryResult([store("store-1")])).items;
    expect(result.find((item) => item.certificateType === safeHealthType)?.requiredCount).toBe(1);
    expect(result.find((item) => item.certificateType === firstAidType)?.requiredCount).toBe(2);
  });

  it("scales requirements linearly with the scoped store count", () => {
    const result = buildCertificateOverview(queryResult([store("a"), store("b"), store("c")])).items;
    expect(result.find((item) => item.certificateType === safeHealthType)?.requiredCount).toBe(3);
    expect(result.find((item) => item.certificateType === firstAidType)?.requiredCount).toBe(6);
  });

  it("recalculates requirements for a single-store scope", () => {
    const result = buildCertificateOverview(queryResult([store("selected-store")])).items;
    expect(result.every((item) => item.requiredCount === (Object.hasOwn(CERTIFICATE_REQUIREMENTS, item.certificateType) ? CERTIFICATE_REQUIREMENTS[item.certificateType] : null))).toBe(true);
  });

  it("includes all formal types and leaves unconfigured requirements null", () => {
    const result = buildCertificateOverview(queryResult([store("a", [record(unconfiguredType, "a")])]));
    expect(result.items.map((item) => item.certificateType)).toEqual(CERTIFICATE_OVERVIEW_TYPE_DISPLAY.map((item) => item.certificateType));
    expect(result.items.find((item) => item.certificateType === unconfiguredType)).toMatchObject({ requiredCount: null, actualCount: 1 });
    expect(result.items.every((item) => item.requiredCount !== 0)).toBe(true);
  });

  it("outputs the taxonomy grouping and item order as chart metadata", () => {
    const result = buildCertificateOverview(queryResult([store("a")]));
    expect(result.groups.map(({ label }) => label)).toEqual(CERTIFICATE_CATEGORIES);
    expect(result.groups.map(({ startIndex, itemCount }) => result.items.slice(startIndex, startIndex + itemCount).map((item) => item.certificateCategory))).toEqual(
      CERTIFICATE_CATEGORIES.map((category) => result.items.filter((item) => item.certificateCategory === category).map((item) => item.certificateCategory)),
    );
    expect(result.items.every((item) => item.categoryLabel === CERTIFICATE_TYPE_CATEGORIES[item.certificateType as keyof typeof CERTIFICATE_TYPE_CATEGORIES])).toBe(true);
  });

  it("counts every normalized record for actual count, including expired certificates", () => {
    const result = buildCertificateOverview(queryResult([
      store("a", [record(safeHealthType, "a"), record(safeHealthType, "a")]),
      store("b", [record(firstAidType, "b")]),
    ])).items;
    expect(result.find((item) => item.certificateType === safeHealthType)?.actualCount).toBe(2);
    expect(result.find((item) => item.certificateType === firstAidType)?.actualCount).toBe(1);
  });

  it("supports changing a configured requirement without UI changes", () => {
    const result = buildCertificateOverview(queryResult([store("a"), store("b")]), {
      ...CERTIFICATE_REQUIREMENTS,
      [firstAidType]: 3,
    }).items;
    expect(result.find((item) => item.certificateType === firstAidType)?.requiredCount).toBe(6);
  });
});
