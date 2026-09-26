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

  const items = CERTIFICATE_OVERVIEW_TYPE_DISPLAY.map(({ certificateType, shortLabel }) => {
    const requiredCount = Object.hasOwn(requirements, certificateType)
      ? storeCount * requirements[certificateType]
      : null;
    return {
      certificateCategory: CERTIFICATE_TYPE_CATEGORIES[certificateType],
      categoryLabel: CERTIFICATE_TYPE_CATEGORIES[certificateType],
      certificateType,
      shortLabel,
      fullLabel: certificateType,
      requiredCount,
      actualCount: actualByType.get(certificateType) ?? 0,
    };
  });

  const groups = CERTIFICATE_CATEGORIES.flatMap((certificateCategory) => {
    const startIndex = items.findIndex((item) => item.certificateCategory === certificateCategory);
    const itemCount = items.filter((item) => item.certificateCategory === certificateCategory).length;
    return itemCount === 0 ? [] : [{ certificateCategory, label: certificateCategory, startIndex, itemCount }];
  });

  return { items, groups };
}
