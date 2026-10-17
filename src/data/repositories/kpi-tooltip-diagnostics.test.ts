import { describe, expect, it } from "vitest";
import { createPerformanceMockDataset } from "@/data/mock/performance";
import { createMockEhsRepository } from "./mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { evaluateTrainingRecords, evaluateInspectionRecords } from "@/lib/rules/training-inspection-rules";
import type { EhsFilterContext } from "@/data/contracts/kpi";

const referenceDate = new Date("2026-10-16T12:00:00+08:00");
describe("KPI tooltip diagnostics", () => {
  it("explains the actual training defects for 霁川东岭007号引力场中心", async () => {
    const dataset = createPerformanceMockDataset(referenceDate);
    const store = dataset.stores.find((item) => item.storeNameCn === "霁川东岭007号引力场中心")!;
    expect(store).toBeDefined();
    const context: EhsFilterContext = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "INCLUDE", values: [store.trtid] }, period: dataset.supportedPeriod };
    const snapshot = await createMockEhsRepository(referenceDate, { dataset }).getKpiData(context);
    const row = buildKpiRows(context, snapshot)[0];
    const invalidRecord = dataset.trainingRecords.find((record) => "trtid" in record.storeReference && record.storeReference.trtid === store.trtid && record.month === "2026-03" && record.trainingName === "Mock 必修培训 B");
    expect(Number.isNaN(invalidRecord?.completionRate)).toBe(true);
    expect(row.training.availability).toBe("INCOMPLETE");
    expect(row.training.diagnostics).toEqual(["2026-03：Mock 必修培训 B：完成率格式错误，须为 0–100 的有效数字"]);
  });

  it("explains empty and invalid received fields without treating missing items as defects", () => {
    const records = [{ storeId: "s", month: "2026-10", trainingName: "空值", completionRate: null, incompletePeople: null }, { storeId: "s", month: "2026-10", trainingName: "非法", completionRate: Number.NaN, incompletePeople: null }] as const;
    const details: string[] = [];
    expect(evaluateTrainingRecords(records, "AVAILABLE", details)).toEqual(evaluateTrainingRecords(records, "AVAILABLE"));
    expect(details.join("；")).toContain("完成率字段为空");
    expect(details.join("；")).toContain("完成率格式错误");
    expect(details.join("；")).not.toContain("缺少记录");
  });

  it("does not diagnose ongoing inspections as missing or invalid", () => {
    const records = [{ storeId: "s", month: "2026-10", inspectionNumber: "i", inspectionName: "检查", status: "进行中" }] as const;
    const details: string[] = [];
    expect(evaluateInspectionRecords(records, "AVAILABLE", details)).toEqual({ result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" });
    expect(details).toEqual([]);
  });
});
