import { describe, expect, it } from "vitest";
import { MOCK_V1_EXPECTED_INSPECTION_TASKS, MOCK_V1_REQUIRED_TRAINING_ITEMS } from "@/data/mock/overview-required-sets";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createPerformanceMockDataset } from "@/data/mock/performance";
import { evaluateExpectedInspections, evaluateRequiredTraining } from "./overview-required-set-rules";

const scope = { storeId: "TEST-001", month: "2026-01" } as const;
const allAvailable = "AVAILABLE" as const;

describe("Overview required-set rules", () => {
  it("evaluates the configured Training set rather than inferring it from observed records", () => {
    const records = MOCK_V1_REQUIRED_TRAINING_ITEMS.map((trainingName) => ({
      storeId: scope.storeId,
      month: scope.month,
      trainingName,
      completionRate: 100,
      incompletePeople: [],
    }));

    expect(evaluateRequiredTraining(MOCK_V1_REQUIRED_TRAINING_ITEMS, records, allAvailable)).toEqual({ result: "ACHIEVED", reason: "ACHIEVED" });
    expect(evaluateRequiredTraining(MOCK_V1_REQUIRED_TRAINING_ITEMS, [...records, { ...records[0], trainingName: "Observed but not required" }], allAvailable)).toEqual({ result: "ACHIEVED", reason: "ACHIEVED" });
    expect(evaluateRequiredTraining(null, records, allAvailable)).toEqual({ result: "UNDETERMINED", reason: "RULE_CONFIGURATION_MISSING" });
  });

  it("returns diagnostic 0/1 outcomes for Training missing, incomplete, invalid, and below 100%", () => {
    const complete = MOCK_V1_REQUIRED_TRAINING_ITEMS.map((trainingName) => ({ storeId: scope.storeId, month: scope.month, trainingName, completionRate: 100, incompletePeople: [] }));
    expect(evaluateRequiredTraining(MOCK_V1_REQUIRED_TRAINING_ITEMS, complete.slice(0, 1), allAvailable).reason).toBe("SOURCE_MISSING");
    expect(evaluateRequiredTraining(MOCK_V1_REQUIRED_TRAINING_ITEMS, [...complete.slice(0, 1), { ...complete[1], completionRate: null }], allAvailable).reason).toBe("SOURCE_INCOMPLETE");
    expect(evaluateRequiredTraining(MOCK_V1_REQUIRED_TRAINING_ITEMS, [...complete.slice(0, 1), { ...complete[1], completionRate: Number.NaN }], allAvailable).reason).toBe("SOURCE_INVALID");
    expect(evaluateRequiredTraining(MOCK_V1_REQUIRED_TRAINING_ITEMS, [...complete.slice(0, 1), { ...complete[1], completionRate: 99 }], allAvailable)).toEqual({ result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" });
  });

  it("evaluates configured Inspection tasks and preserves existing exact Completed mapping", () => {
    const records = MOCK_V1_EXPECTED_INSPECTION_TASKS.map((inspectionName, index) => ({
      storeId: scope.storeId,
      inspectionNumber: `INP-${index}`,
      inspectionName,
      status: "已完成",
    }));

    expect(evaluateExpectedInspections(MOCK_V1_EXPECTED_INSPECTION_TASKS, records, allAvailable)).toEqual({ result: "ACHIEVED", reason: "ACHIEVED" });
    expect(evaluateExpectedInspections(MOCK_V1_EXPECTED_INSPECTION_TASKS, [...records, { ...records[0], inspectionName: "Observed but not required" }], allAvailable)).toEqual({ result: "ACHIEVED", reason: "ACHIEVED" });
    expect(evaluateExpectedInspections(null, records, allAvailable).reason).toBe("RULE_CONFIGURATION_MISSING");
    expect(evaluateExpectedInspections(MOCK_V1_EXPECTED_INSPECTION_TASKS, records.slice(0, 1), allAvailable).reason).toBe("SOURCE_MISSING");
    expect(evaluateExpectedInspections(MOCK_V1_EXPECTED_INSPECTION_TASKS, [...records.slice(0, 1), { ...records[1], status: "未完成" }], allAvailable)).toEqual({ result: "NOT_ACHIEVED", reason: "RULE_NOT_MET" });
    expect(evaluateExpectedInspections(MOCK_V1_EXPECTED_INSPECTION_TASKS, [...records.slice(0, 1), { ...records[1], sourceStatusInvalid: true }], allAvailable).reason).toBe("SOURCE_INVALID");
    expect(evaluateExpectedInspections(MOCK_V1_EXPECTED_INSPECTION_TASKS, [...records.slice(0, 1), { ...records[1], status: null }], allAvailable).reason).toBe("SOURCE_INCOMPLETE");
  });

  it("uses the same mock required sets in Standard and Performance source generators", () => {
    const standard = createKpiMockData(new Date("2026-09-11T00:00:00+08:00"));
    const performance = createPerformanceMockDataset(new Date("2026-09-11T00:00:00+08:00"));
    const names = (records: readonly { trainingName: string }[]) => new Set(records.map(({ trainingName }) => trainingName));
    const tasks = (records: readonly { inspectionName: string }[]) => new Set(records.map(({ inspectionName }) => inspectionName));

    expect(names(standard.trainingRecords)).toEqual(names(performance.trainingRecords));
    expect(tasks(standard.inspectionRecords)).toEqual(tasks(performance.inspectionRecords));
    expect(names(standard.trainingRecords)).toEqual(new Set(MOCK_V1_REQUIRED_TRAINING_ITEMS));
    expect(tasks(standard.inspectionRecords)).toEqual(new Set(MOCK_V1_EXPECTED_INSPECTION_TASKS));
  });
});
