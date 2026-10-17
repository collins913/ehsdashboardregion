import { describe, expect, it } from "vitest";
import { evaluateTrainingRecords, evaluateInspectionRecords } from "./training-inspection-rules";
import { evaluateKpiDomain } from "./kpi-domain";
import type { KpiDomainInput } from "./kpi-domain";

const training = { storeId: "s", month: "2026-01", trainingName: "任意来源培训", completionRate: 100, incompletePeople: [] } as const;
const inspection = { storeId: "s", month: "2026-03", inspectionNumber: "i", inspectionName: "任意来源检查", status: "已完成" } as const;
const achieved = { result: "ACHIEVED", reason: "ACHIEVED" };

describe("received Training / Inspection records", () => {
  it("accepts arbitrary supplied names and multiple records with the same name", () => {
    expect(evaluateTrainingRecords([training, training], "AVAILABLE")).toEqual(achieved);
    expect(evaluateInspectionRecords([inspection, { ...inspection, inspectionNumber: "i-2" }], "AVAILABLE")).toEqual(achieved);
  });
  it.each(["AVAILABLE", "CONFIRMED_EMPTY"] as const)("treats covered empty %s data as no pending work", (availability) => {
    expect(evaluateTrainingRecords([], availability)).toEqual(achieved);
    expect(evaluateInspectionRecords([], availability)).toEqual(achieved);
  });
  it("does not require every month or a matching Training/Inspection record", () => {
    const input: KpiDomainInput = { store: { storeId: "s", displayName: "测试门店", region: "区", area: "小区" }, months: ["2026-01", "2026-02", "2026-03"],
      training: { availability: "AVAILABLE", items: [training] }, inspections: { availability: "AVAILABLE", items: [inspection] },
      drills: { availability: "CONFIRMED_EMPTY", items: [] }, actionClosureRates: { availability: "CONFIRMED_EMPTY", items: [] }, events: { availability: "CONFIRMED_EMPTY", items: [] } };
    const details = { training: [] as string[], inspections: [] as string[] };
    const result = evaluateKpiDomain(input, null, details);
    expect(result.training).toMatchObject(achieved);
    expect(result.inspections).toMatchObject(achieved);
    expect(details).toEqual({ training: [], inspections: [] });
    expect(evaluateKpiDomain({ ...input, inspections: { availability: "CONFIRMED_EMPTY", items: [] } }, null).inspections).toMatchObject(achieved);
  });
  it("retains unfinished results for existing records", () => {
    expect(evaluateTrainingRecords([{ ...training, completionRate: 84 }], "AVAILABLE").result).toBe("NOT_ACHIEVED");
    expect(evaluateInspectionRecords([{ ...inspection, status: "进行中" }], "AVAILABLE").result).toBe("NOT_ACHIEVED");
  });
  it("keeps missing or invalid fields inconclusive and evaluates all actual records", () => {
    expect(evaluateTrainingRecords([{ ...training, completionRate: null }], "AVAILABLE").reason).toBe("SOURCE_INCOMPLETE");
    expect(evaluateTrainingRecords([{ ...training, completionRate: 84 }, { ...training, completionRate: Number.NaN }], "AVAILABLE").reason).toBe("SOURCE_INVALID");
    expect(evaluateInspectionRecords([{ ...inspection, status: null }], "AVAILABLE").reason).toBe("SOURCE_INCOMPLETE");
    expect(evaluateInspectionRecords([{ ...inspection, status: "进行中" }, { ...inspection, sourceStatusInvalid: true }], "AVAILABLE").reason).toBe("SOURCE_INVALID");
  });
  it.each(["INCOMPLETE", "UNAVAILABLE"] as const)("does not confuse %s source coverage with a confirmed empty scope", (availability) => {
    expect(evaluateTrainingRecords([], availability).result).toBe("UNDETERMINED");
    expect(evaluateInspectionRecords([], availability).result).toBe("UNDETERMINED");
  });
});
