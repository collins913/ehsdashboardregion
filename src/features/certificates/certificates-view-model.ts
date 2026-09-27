import { storeScopeQueryKey } from "@/features/global-filters/global-filter-state";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import type { CertificatesStoreRow, CertificateCategorySummary, NormalizedCertificateRecord } from "@/data/contracts/certificates";
import { CERTIFICATE_TYPE_CATEGORIES } from "@/lib/rules/certificate-types";

export const CERTIFICATES_ITEMS = [
  { key: "safetyHealth", label: "安全健康" },
  { key: "firstAid", label: "急救员" },
  { key: "specialOperations", label: "特种作业" },
  { key: "safeDriving", label: "安全驾驶" },
] as const;
export type CertificatesItemKey = typeof CERTIFICATES_ITEMS[number]["key"];
export type CertificatesViewMode = "ALL" | "ABNORMAL_ONLY";
export const DEFAULT_CERTIFICATES_VIEW_MODE: CertificatesViewMode = "ALL";
export type CertificatesTableRow = CertificatesStoreRow & {
  safetyHealth: CertificateCategorySummary["status"];
  firstAid: CertificateCategorySummary["status"];
  specialOperations: CertificateCategorySummary["status"];
  safeDriving: CertificateCategorySummary["status"];
};
export function filterCertificatesTableRows(
  rows: readonly CertificatesTableRow[],
  viewMode: CertificatesViewMode,
): readonly CertificatesTableRow[] {
  return viewMode === "ALL"
    ? rows
    : rows.filter((row) => row.categories.some((category) => category.status === "ABNORMAL"));
}

export function toCertificatesTableRows(rows: readonly CertificatesStoreRow[]): CertificatesTableRow[] {
  return rows.map((row) => {
    const statusFor = (category: CertificateCategorySummary["certificateCategory"]) => {
      const summary = row.categories.find((item) => item.certificateCategory === category);
      if (!summary) throw new Error("Missing normalized Certificate category.");
      return summary.status;
    };
    return { ...row, safetyHealth: statusFor("安全健康"), firstAid: statusFor("急救员"), specialOperations: statusFor("特种作业"), safeDriving: statusFor("安全驾驶") };
  });
}
export interface CertificateDetailGroup {
  certificateType: string;
  label: string;
  count: number;
  hasAbnormalRecords: boolean;
  records: readonly NormalizedCertificateRecord[];
  disabled: boolean;
}

// Presentation preparation: taxonomy determines membership and order; record state is already evaluated upstream.
export function groupCertificateRecords(
  category: CertificateCategorySummary["certificateCategory"],
  records: readonly NormalizedCertificateRecord[],
): readonly CertificateDetailGroup[] {
  return Object.entries(CERTIFICATE_TYPE_CATEGORIES)
    .filter(([, certificateCategory]) => certificateCategory === category)
    .map(([certificateType]) => {
      const typeRecords = records.filter((record) => record.certificateType === certificateType);
      return {
        certificateType,
        label: certificateType,
        count: typeRecords.length,
        hasAbnormalRecords: typeRecords.some((record) => record.certificateStatus === "ABNORMAL"),
        records: typeRecords,
        disabled: typeRecords.length === 0,
      };
    });
}

export function buildCertificatesDetail(record: CertificatesTableRow, key: CertificatesItemKey) {
  const category = CERTIFICATES_ITEMS.find((item) => item.key === key)!.label;
  const summary = record.categories.find((item) => item.certificateCategory === category)!;
  return {
    storeDisplayName: record.storeDisplayName,
    ...summary,
    groups: groupCertificateRecords(summary.certificateCategory, summary.records),
  };
}
export type CertificatesDetail = ReturnType<typeof buildCertificatesDetail>;
export function certificatesQueryKey(context: EhsStoreScope | null, referenceDateIso: string) {
  const scopeKey = storeScopeQueryKey(context);
  return scopeKey === null ? null : JSON.stringify([referenceDateIso, scopeKey]);
}
