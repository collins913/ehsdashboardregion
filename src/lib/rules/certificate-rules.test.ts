import { describe, expect, it } from "vitest";
import { certificateCategoryForType, CERTIFICATE_TYPE_CATEGORIES } from "./certificate-types";
import { evaluateCertificateRecord, evaluateCertificateCategory } from "./certificate-rules";

describe("Certificates V1 rules", () => {
  it.each(Object.entries(CERTIFICATE_TYPE_CATEGORIES))("maps exactly %s", (type, category) => {
    expect(certificateCategoryForType(type)).toBe(category);
    expect(certificateCategoryForType(type + " ")).toBeNull();
  });
  it.each(["内训师", "内驾证", "店长安全证", "EHS RN安全证", "职业健康证", "红十字急救员", "焊工证", "future", "toString"])("does not guess %s", (type) => {
    expect(certificateCategoryForType(type)).toBeNull();
  });
  it.each([
    ["2026-09-20", "NORMAL", "NORMAL", 5],
    ["2026-09-15", "NORMAL", "NORMAL", 0],
    ["2026-09-14", "ABNORMAL", "EXPIRED", -1],
    [null, "ABNORMAL", "MISSING_EXPIRY_DATE", null],
    ["", "ABNORMAL", "MISSING_EXPIRY_DATE", null],
    ["invalid", "ABNORMAL", "INVALID_EXPIRY_DATE", null],
    ["2026-02-30", "ABNORMAL", "INVALID_EXPIRY_DATE", null],
    ["2026-09-15T00:00:00Z", "ABNORMAL", "INVALID_EXPIRY_DATE", null],
  ])("evaluates %s against date-only reference", (expiry, status, reason, days) => {
    expect(evaluateCertificateRecord(expiry as string | null, "2026-09-15")).toEqual({ certificateStatus: status, certificateReason: reason, daysUntilExpiry: days });
  });
  it("uses calendar days across leap day", () => {
    expect(evaluateCertificateRecord("2024-03-01", "2024-02-28").daysUntilExpiry).toBe(2);
    expect(() => evaluateCertificateRecord("2026-01-01", "invalid")).toThrow();
  });
  it.each([
    [[], "ABNORMAL"], [["2026-09-20"], "NORMAL"],
    [["2026-09-15", "2026-09-20"], "NORMAL"],
    [["2026-09-20", "2026-09-14"], "ABNORMAL"],
    [["2026-09-20", null], "ABNORMAL"],
  ] as const)("evaluates category records %j", (expiries, status) => {
    expect(evaluateCertificateCategory(expiries.map((expiry) => evaluateCertificateRecord(expiry, "2026-09-15")))).toBe(status);
  });
});
