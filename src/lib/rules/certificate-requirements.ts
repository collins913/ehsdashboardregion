import type { DefaultCertificateCategory } from "@/types/ehs";
import type { CertificateOverviewResult, CertificatesQueryResult } from "@/data/contracts/certificates";
import { CERTIFICATE_CATEGORIES, CERTIFICATE_OVERVIEW_TYPE_DISPLAY, CERTIFICATE_TYPE_CATEGORIES } from "./certificate-types";

export type CertificateRequirementConfig = Readonly<Record<string, number>>;

/** Explicit per-store requirements for the Certificate Overview only. */
export const CERTIFICATE_REQUIREMENTS: CertificateRequirementConfig = {
  "主要负责人安全生产培训合格证书-S": 1,
  "安全生产管理人员安全生产培训合格证书-M": 1,
  "主要负责人职业卫生培训合格证书-H1": 1,
  "职业卫生管理人员职业卫生培训合格证书-H2": 1,
  "急救员证": 2,
  "安全驾驶内训师": 1,
};

export function buildCertificateOverview(
  result: CertificatesQueryResult,
  requirements: CertificateRequirementConfig = CERTIFICATE_REQUIREMENTS,
  typeCategories: Readonly<Record<string, DefaultCertificateCategory>> = CERTIFICATE_TYPE_CATEGORIES,
): CertificateOverviewResult {
  const storeCount = result.items.length;
  const actualByType = new Map<string, number>();

  for (const store of result.items) {
    for (const category of store.categories) {
      for (const record of category.records) {
        actualByType.set(
          record.certificateType,
          (actualByType.get(record.certificateType) ?? 0) + 1,
        );
      }
    }
  }
  for (const record of result.unknownTypeRecords) {
    actualByType.set(
      record.certificateType,
      (actualByType.get(record.certificateType) ?? 0) + 1,
    );
  }

  const shortLabels = new Map<string, string>(CERTIFICATE_OVERVIEW_TYPE_DISPLAY.map(({ certificateType, shortLabel }) => [certificateType, shortLabel]));
  const items = CERTIFICATE_CATEGORIES.flatMap((category) =>
    Object.entries(typeCategories).filter(([, itemCategory]) => itemCategory === category).map(([certificateType]) => {
      const requiredCount = Object.hasOwn(requirements, certificateType)
        ? storeCount * requirements[certificateType]
        : null;
      const actualCount = actualByType.get(certificateType) ?? 0;
      return {
        certificateCategory: category,
        categoryLabel: category,
        certificateType,
        shortLabel: shortLabels.get(certificateType) ?? certificateType,
        fullLabel: certificateType,
        requiredCount,
        actualCount,
        // Display geometry only; actual counts and certificate compliance stay unchanged.
        progressValue: requiredCount !== null && requiredCount > 0
          ? Math.min(100, Math.max(0, actualCount / requiredCount * 100))
          : null,
      };
    }));

  const groups = CERTIFICATE_CATEGORIES.flatMap((certificateCategory) => {
    const startIndex = items.findIndex((item) => item.certificateCategory === certificateCategory);
    const itemCount = items.filter((item) => item.certificateCategory === certificateCategory).length;
    return itemCount === 0 ? [] : [{ certificateCategory, label: certificateCategory, startIndex, itemCount }];
  });

  return { items, groups };
}
