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

export const CERTIFICATE_OVERVIEW_TYPE_DISPLAY = [
  { certificateType: "主要负责人安全生产培训合格证书-S", shortLabel: "S" },
  { certificateType: "安全生产管理人员安全生产培训合格证书-M", shortLabel: "M" },
  { certificateType: "主要负责人职业卫生培训合格证书-H1", shortLabel: "H1" },
  { certificateType: "职业卫生管理人员职业卫生培训合格证书-H2", shortLabel: "H2" },
  { certificateType: "急救员证", shortLabel: "急救" },
  { certificateType: "熔化焊接与热切割作业", shortLabel: "焊接" },
  { certificateType: "安全驾驶内训师", shortLabel: "内训" },
  { certificateType: "安全驾驶内驾证", shortLabel: "内驾" },
] as const satisfies readonly {
  certificateType: keyof typeof CERTIFICATE_TYPE_CATEGORIES;
  shortLabel: string;
}[];

export function certificateCategoryForType(type: string): DefaultCertificateCategory | null {
  return Object.hasOwn(CERTIFICATE_TYPE_CATEGORIES, type)
    ? CERTIFICATE_TYPE_CATEGORIES[type as keyof typeof CERTIFICATE_TYPE_CATEGORIES]
    : null;
}
