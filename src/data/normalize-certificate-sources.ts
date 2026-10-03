import type { RawCertificateRecord, StoreMasterData, StoreId, DefaultCertificateCategory } from "@/types/ehs";
import type { NormalizedCertificateRecord } from "./contracts/certificates";
import type { StoreReferenceResolver } from "./resolve-store-reference";
import { sourceIssueStoreIds } from "./normalize-kpi-sources";
import { certificateCategoryForType } from "@/lib/rules/certificate-types";

type CertificateSource = Omit<NormalizedCertificateRecord, "certificateStatus" | "certificateReason" | "daysUntilExpiry">;
export function prepareCertificateSources(rawRecords: readonly RawCertificateRecord[], stores: readonly StoreMasterData[], resolve: StoreReferenceResolver) {
  const byStore = new Map<StoreId, CertificateSource[]>();
  const issues: { storeIds: readonly StoreId[]; category: DefaultCertificateCategory | null }[] = [];
  for (const raw of rawRecords) {
    const reference = { trtid: raw.TRTID, storeNameEn: raw["English Store Name"] };
    const resolution = resolve(reference);
    const certificateCategory = certificateCategoryForType(raw["Certificate Type"]);
    if (resolution.kind !== "RESOLVED") {
      issues.push({ storeIds: sourceIssueStoreIds(reference, stores), category: certificateCategory });
      continue;
    }
    const store = resolution.store;
    const records = byStore.get(store.trtid) ?? [];
    records.push({ storeId: store.trtid, storeDisplayName: store.storeNameCn, certificateCategory,
      certificateType: raw["Certificate Type"], person: raw.Person, personEmail: raw["Person Email"],
      businessTitle: raw["Business Title"], expiryDate: raw["Expiry Date"] });
    byStore.set(store.trtid, records);
  }
  return { byStore, issues };
}
