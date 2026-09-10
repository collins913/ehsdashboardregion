import type { CertificateRequirement } from "@/types/ehs";

export const CERTIFICATE_REQUIREMENTS = [
  {
    certificateCategory: "安全证书",
    slots: [
      {
        requiredSlot: "S",
        certificateTypes: ["主要负责人安全生产培训合格证书-S", "店长安全证"],
      },
      {
        requiredSlot: "M",
        certificateTypes: ["安全生产管理人员安全生产培训合格证书-M", "EHS RN安全证"],
      },
    ],
  },
  {
    certificateCategory: "职业卫生证书",
    slots: [
      {
        requiredSlot: "H1",
        certificateTypes: ["主要负责人职业卫生培训合格证书-H1", "职业健康证"],
      },
      {
        requiredSlot: "H2",
        certificateTypes: ["职业卫生管理人员职业卫生培训合格证书-H2", "职业健康证"],
      },
    ],
  },
  {
    certificateCategory: "急救员",
    slots: [
      {
        requiredSlot: "First Aid",
        certificateTypes: ["急救员证", "红十字急救员"],
      },
    ],
  },
  {
    certificateCategory: "焊工证",
    slots: [
      {
        requiredSlot: "Welding",
        certificateTypes: ["熔化焊接与热切割作业", "焊工证"],
      },
    ],
  },
  {
    certificateCategory: "内驾证",
    slots: [
      { requiredSlot: "Trainer", certificateTypes: ["内训师"] },
      { requiredSlot: "Internal Driving", certificateTypes: ["内驾证"] },
    ],
  },
] as const satisfies readonly CertificateRequirement[];
