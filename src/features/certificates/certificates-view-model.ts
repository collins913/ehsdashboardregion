import { storeScopeQueryKey } from "@/features/global-filters/global-filter-state";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import type { CertificatesStoreRow, CertificateCategorySummary, NormalizedCertificateRecord } from "@/data/contracts/certificates";

export const CERTIFICATES_ITEMS = [
  { key: "safetyHealth", label: "安全健康" },
  { key: "firstAid", label: "急救员" },
  { key: "specialOperations", label: "特种作业" },
  { key: "safeDriving", label: "安全驾驶" },
] as const;
export type CertificatesItemKey = typeof CERTIFICATES_ITEMS[number]["key"];
export type CertificatesTableRow = CertificatesStoreRow & {
  safetyHealth: CertificateCategorySummary["status"];
  firstAid: CertificateCategorySummary["status"];
  specialOperations: CertificateCategorySummary["status"];
  safeDriving: CertificateCategorySummary["status"];
};
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
export interface CertificateTypeGroup {
  certificateType: string;
  records: readonly NormalizedCertificateRecord[];
}

// Presentation only: preserve first-seen Type order and every normalized record.
export function groupCertificateRecords(records: readonly NormalizedCertificateRecord[]): readonly CertificateTypeGroup[] {
  const groups = new Map<string, NormalizedCertificateRecord[]>();
  for (const record of records) {
    const group = groups.get(record.certificateType);
    if (group) group.push(record);
    else groups.set(record.certificateType, [record]);
  }
  return [...groups].map(([certificateType, records]) => ({ certificateType, records }));
}

export function buildCertificatesDetail(record: CertificatesTableRow, key: CertificatesItemKey) {
  const category = CERTIFICATES_ITEMS.find((item) => item.key === key)!.label;
  const summary = record.categories.find((item) => item.certificateCategory === category)!;
  return { storeDisplayName: record.storeDisplayName, ...summary, groups: groupCertificateRecords(summary.records) };
}
export type CertificatesDetail = ReturnType<typeof buildCertificatesDetail>;
export function certificatesQueryKey(context: EhsStoreScope | null, referenceDateIso: string) {
  const scopeKey = storeScopeQueryKey(context);
  return scopeKey === null ? null : JSON.stringify([referenceDateIso, scopeKey]);
}
