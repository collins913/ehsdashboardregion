import type { DefaultCertificateCategory } from "@/types/ehs";

export const CERTIFICATE_CATEGORIES = ["安全健康", "急救员", "特种作业", "安全驾驶"] as const;
export const CERTIFICATE_TYPE_CATEGORIES = {
  "主要负责人安全生产培训合格证书-S": "安全健康",
  "安全生产管理人员安全生产培训合格证书-M": "安全健康",
  "主要负责人职业卫生培训合格证书-H1": "安全健康",
  "职业卫生管理人员职业卫生培训合格证书-H2": "安全健康",
  "急救员证": "急救员",
  "熔化焊接与热切割作业": "特种作业",
  "安全驾驶内训师": "安全驾驶",
  "安全驾驶内驾证": "安全驾驶",
} as const satisfies Readonly<Record<string, DefaultCertificateCategory>>;

export function certificateCategoryForType(type: string): DefaultCertificateCategory | null {
  return Object.hasOwn(CERTIFICATE_TYPE_CATEGORIES, type)
    ? CERTIFICATE_TYPE_CATEGORIES[type as keyof typeof CERTIFICATE_TYPE_CATEGORIES]
    : null;
}
