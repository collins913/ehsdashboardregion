import type { CertificateReason, CertificateStatus } from "@/data/contracts/certificates";
import { isValidIsoDate } from "./expiry";

const DAY_MILLISECONDS = 86_400_000;
export function evaluateCertificateRecord(expiryDate: string | null | undefined, referenceDate: string): {
  certificateStatus: CertificateStatus;
  certificateReason: CertificateReason;
  daysUntilExpiry: number | null;
} {
  if (!isValidIsoDate(referenceDate)) throw new Error("Invalid Certificate referenceDate.");
  if (expiryDate == null || expiryDate === "") {
    return { certificateStatus: "ABNORMAL", certificateReason: "MISSING_EXPIRY_DATE", daysUntilExpiry: null };
  }
  if (!isValidIsoDate(expiryDate)) {
    return { certificateStatus: "ABNORMAL", certificateReason: "INVALID_EXPIRY_DATE", daysUntilExpiry: null };
  }
  // UTC calendar midnights represent date-only arithmetic, not local timestamps.
  const daysUntilExpiry = (Date.parse(expiryDate + "T00:00:00Z") - Date.parse(referenceDate + "T00:00:00Z")) / DAY_MILLISECONDS;
  return {
    certificateStatus: daysUntilExpiry < 0 ? "ABNORMAL" : "NORMAL",
    certificateReason: daysUntilExpiry < 0 ? "EXPIRED" : "NORMAL",
    daysUntilExpiry,
  };
}
export function evaluateCertificateCategory(records: readonly { certificateStatus: CertificateStatus }[]): CertificateStatus {
  return records.length === 0 || records.some((record) => record.certificateStatus === "ABNORMAL") ? "ABNORMAL" : "NORMAL";
}
