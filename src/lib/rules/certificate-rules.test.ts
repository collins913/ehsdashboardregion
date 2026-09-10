import { describe, expect, it } from "vitest";
import type {
  CertificateCategory,
  CertificateRecord,
  CertificateRequirement,
} from "@/types/ehs";
import { CERTIFICATE_REQUIREMENTS } from "./certificate-requirements";
import { evaluateCertificateCategory } from "./certificate-rules";

const expiryPolicy = { referenceDate: "2026-09-10" };

function requirement(category: CertificateCategory): CertificateRequirement {
  const found = CERTIFICATE_REQUIREMENTS.find(
    ({ certificateCategory }) => certificateCategory === category,
  );
  if (found === undefined) {
    throw new Error(`Missing test requirement: ${category}`);
  }
  return found;
}

function certificate(
  certificateCategory: CertificateCategory,
  certificateType: string,
  expiryDate: CertificateRecord["expiryDate"] = "2027-01-01",
): CertificateRecord {
  return {
    storeReference: { trtid: "TEST-001" },
    certificateCategory,
    certificateType,
    person: "Test",
    roleTitle: "Ignored by matching",
    expiryDate,
  };
}

describe("certificate requirement configuration", () => {
  it("contains the confirmed categories and exact Slot definitions", () => {
    expect(CERTIFICATE_REQUIREMENTS).toEqual([
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
    ]);
  });
});

describe("evaluateCertificateCategory", () => {
  it("returns NORMAL when all Slots exist and all Certificates are valid", () => {
    const result = evaluateCertificateCategory(
      [
        certificate("安全证书", "店长安全证"),
        certificate("安全证书", "EHS RN安全证"),
      ],
      requirement("安全证书"),
      expiryPolicy,
    );
    expect(result.businessResult).toBe("NORMAL");
    expect(result.reason).toBe("NORMAL");
  });

  it("returns NO_RECORD when the category has no records", () => {
    const result = evaluateCertificateCategory(
      [],
      requirement("安全证书"),
      expiryPolicy,
    );
    expect(result).toMatchObject({
      businessResult: "ABNORMAL",
      reason: "NO_RECORD",
    });
  });

  it("returns MISSING_REQUIRED_SLOT when a Slot is missing", () => {
    const result = evaluateCertificateCategory(
      [certificate("安全证书", "店长安全证")],
      requirement("安全证书"),
      expiryPolicy,
    );
    expect(result).toMatchObject({
      businessResult: "ABNORMAL",
      reason: "MISSING_REQUIRED_SLOT",
      missingSlots: ["M"],
    });
  });

  it("does not assign one Certificate to both H1 and H2", () => {
    const result = evaluateCertificateCategory(
      [certificate("职业卫生证书", "职业健康证")],
      requirement("职业卫生证书"),
      expiryPolicy,
    );
    expect(result.businessResult).toBe("ABNORMAL");
    expect(result.reason).toBe("MISSING_REQUIRED_SLOT");
    expect(result.assignments).toHaveLength(1);
    expect(result.missingSlots).toHaveLength(1);
  });

  it("allows two separate 职业健康证 records to satisfy H1 and H2", () => {
    const result = evaluateCertificateCategory(
      [
        certificate("职业卫生证书", "职业健康证"),
        certificate("职业卫生证书", "职业健康证"),
      ],
      requirement("职业卫生证书"),
      expiryPolicy,
    );
    expect(result.businessResult).toBe("NORMAL");
    expect(result.assignments).toHaveLength(2);
  });

  it("returns EXPIRED_CERTIFICATE for an expired required Certificate", () => {
    const result = evaluateCertificateCategory(
      [certificate("急救员", "急救员证", "2026-09-09")],
      requirement("急救员"),
      expiryPolicy,
    );
    expect(result).toMatchObject({
      businessResult: "ABNORMAL",
      reason: "EXPIRED_CERTIFICATE",
    });
  });

  it("returns EXPIRED_CERTIFICATE for an expired additional Certificate", () => {
    const result = evaluateCertificateCategory(
      [
        certificate("急救员", "急救员证"),
        certificate("急救员", "额外证件", "2026-09-09"),
      ],
      requirement("急救员"),
      expiryPolicy,
    );
    expect(result).toMatchObject({
      businessResult: "ABNORMAL",
      reason: "EXPIRED_CERTIFICATE",
    });
  });

  it.each([null, "2026-02-30"])(
    "returns UNDETERMINED for missing or malformed expiry: %s",
    (expiryDate) => {
      const result = evaluateCertificateCategory(
        [
          certificate(
            "急救员",
            "急救员证",
            expiryDate as CertificateRecord["expiryDate"],
          ),
        ],
        requirement("急救员"),
        expiryPolicy,
      );
      expect(result).toMatchObject({
        businessResult: "UNDETERMINED",
        reason: "MISSING_EXPIRY_DATE",
      });
    },
  );

  it("does not mutate input records or requirements", () => {
    const records = Object.freeze([
      Object.freeze(certificate("急救员", "急救员证")),
    ]);
    const required = requirement("急救员");
    const snapshot = structuredClone(records);
    evaluateCertificateCategory(records, required, expiryPolicy);
    expect(records).toEqual(snapshot);
  });
});
