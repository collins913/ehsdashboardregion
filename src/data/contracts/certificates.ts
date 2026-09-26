import type { DataSet, EhsStoreScope } from "@/data/contracts/kpi";
import type { DefaultCertificateCategory, StoreId } from "@/types/ehs";

export type CertificateStatus = "NORMAL" | "ABNORMAL";
export type CertificateReason = "NORMAL" | "EXPIRED" | "MISSING_EXPIRY_DATE" | "INVALID_EXPIRY_DATE";
export interface NormalizedCertificateRecord {
  storeId: StoreId;
  storeDisplayName: string;
  certificateCategory: DefaultCertificateCategory | null;
  certificateType: string;
  person: string;
  personEmail: string;
  businessTitle: string;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  certificateStatus: CertificateStatus;
  certificateReason: CertificateReason;
}
export interface CertificateCategorySummary {
  certificateCategory: DefaultCertificateCategory;
  status: CertificateStatus;
  records: readonly NormalizedCertificateRecord[];
}
export interface CertificatesStoreRow {
  storeId: StoreId;
  storeDisplayName: string;
  categories: readonly CertificateCategorySummary[];
}
export interface CertificatesQuery { context: EhsStoreScope }
export type CertificatesQueryResult = DataSet<CertificatesStoreRow> & {
  unknownTypeRecords: readonly NormalizedCertificateRecord[];
};

export interface CertificateOverviewItem {
  certificateCategory: DefaultCertificateCategory;
  categoryLabel: string;
  certificateType: string;
  shortLabel: string;
  fullLabel: string;
  requiredCount: number | null;
  actualCount: number;
}

export interface CertificateOverviewGroup {
  certificateCategory: DefaultCertificateCategory;
  label: string;
  startIndex: number;
  itemCount: number;
}

export interface CertificateOverviewResult {
  items: readonly CertificateOverviewItem[];
  groups: readonly CertificateOverviewGroup[];
}

export type CertificatesPageQueryResult = CertificatesQueryResult & {
  overview: CertificateOverviewResult;
};
