import { createMockInspectionRecordsForStores } from "@/data/mock/inspections";
import { sourceStatusCompletion } from "@/lib/rules/performance-rules";
import { describe, expect, it } from "vitest";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { IsoDate } from "@/types/ehs";

const referenceDate = new Date("2026-03-15T00:00:00+08:00");
const sourceDataset = createKpiMockData(referenceDate);
const targetStore = sourceDataset.stores[0]!;
const period = periodFromMonthRange("2026-01", "2026-03")!;
const context: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "INCLUDE", values: [targetStore.trtid] },
  period,
};

describe("KPI source contracts", () => {
  it("uses consistent open-text Inspection labels while retaining unfinished records", () => {
    const textualStatuses = sourceDataset.inspectionRecords
      .map((record) => record.status)
      .filter((status) => typeof status === "string");
    expect(new Set(textualStatuses)).toEqual(new Set(["进行中", "已完成"]));
  });

  it.each([0, 1, 2, 3, 4, 5, 6])("preserves the original completion outcome for Inspection Mock scenario %s", (scenario) => {
    const records = createMockInspectionRecordsForStores([targetStore], ["2026-01"], () => scenario);
    if (scenario === 2) expect(records).toHaveLength(1);
    else expect(records).toHaveLength(2);
    expect(sourceStatusCompletion(records[0].status)).toBe(true);
    if (scenario === 1) {
      expect(records[1].status).toBe("进行中");
      expect(sourceStatusCompletion(records[1].status)).toBe(sourceStatusCompletion("未完成"));
      expect(sourceStatusCompletion(records[1].status)).toBe(false);
    } else if (scenario === 3) expect(records[1].status).toBe(42);
    else if (scenario === 4) expect(records[1].status).toBeNull();
    else if (scenario !== 2) expect(sourceStatusCompletion(records[1].status)).toBe(true);
  });

  it("uses the shared TRTID-primary / English-name-fallback resolver for Training, Drill, and Inspection", async () => {
    const training = sourceDataset.trainingRecords[0]!;
    const drill = sourceDataset.drillRecords[0]!;
    const inspection = sourceDataset.inspectionRecords[0]!;
    const fallbackReference = {
      trtid: "STALE-TRTID",
      storeNameEn: targetStore.storeNameEn,
    } as const;
    const dataset = {
      ...sourceDataset,
      trainingRecords: sourceDataset.trainingRecords.map((record) =>
        record === training ? { ...record, storeReference: fallbackReference } : record,
      ),
      drillRecords: sourceDataset.drillRecords.map((record) =>
        record === drill ? { ...record, storeReference: fallbackReference } : record,
      ),
      inspectionRecords: sourceDataset.inspectionRecords.map((record) =>
        record === inspection ? { ...record, storeReference: fallbackReference } : record,
      ),
    };
    const repository = createMockEhsRepository(referenceDate, { dataset });
    const result = await repository.getKpiData(context);

    expect(result.training.availability).toBe("AVAILABLE");
    expect(result.training.items.some((record) => record.storeId === targetStore.trtid)).toBe(true);
    expect(result.drills.availability).toBe("AVAILABLE");
    expect(result.drills.items.some((record) => record.storeId === targetStore.trtid)).toBe(true);
    expect(result.inspections.availability).toBe("AVAILABLE");
    expect(result.inspections.items.some((record) => record.storeId === targetStore.trtid)).toBe(true);
  });

  it("keeps deterministic unique Inspection numbers through the detail query and preserves duplicate rows", async () => {
    const record = sourceDataset.inspectionRecords.find(
      (item) => "trtid" in item.storeReference && item.storeReference.trtid === targetStore.trtid,
    )!;
    const dataset = {
      ...sourceDataset,
      inspectionRecords: [
        ...sourceDataset.inspectionRecords,
        { ...record, inspectionName: "重复编号的原始行", dueDate: "2026-01-21" as IsoDate },
      ],
    };
    const repository = createMockEhsRepository(referenceDate, { dataset });
    const result = await repository.getKpiInspectionDetails({
      context,
      storeId: targetStore.trtid,
    });

    expect(record.inspectionNumber).toMatch(/^INP-\d{5}$/);
    expect(result.items.filter((item) => item.inspectionNumber === record.inspectionNumber)).toHaveLength(2);
    expect(result.items.some((item) => item.inspectionNumber === record.inspectionNumber)).toBe(true);
  });

  it("uses Inspection dueDate, not a source month, for KPI and detail Period scope", async () => {
    const targetRecords = sourceDataset.inspectionRecords.filter(
      (item) => "trtid" in item.storeReference && item.storeReference.trtid === targetStore.trtid,
    );
    const outsideRecord = targetRecords[0]!;
    const insideRecord = targetRecords.find((item) => item.dueDate?.startsWith("2026-03"))!;
    const dataset = {
      ...sourceDataset,
      inspectionRecords: sourceDataset.inspectionRecords.map((item) => {
        if (item === outsideRecord) {
          return { ...item, dueDate: "2026-04-20" as IsoDate };
        }
        if (item === insideRecord) {
          return { ...item, dueDate: "2026-03-01" as IsoDate };
        }
        return item;
      }),
    };
    const repository = createMockEhsRepository(referenceDate, { dataset });
    const snapshot = await repository.getKpiData(context);
    const details = await repository.getKpiInspectionDetails({
      context,
      storeId: targetStore.trtid,
    });

    expect(snapshot.inspections.items.map(({ inspectionNumber }) => inspectionNumber))
      .toContain(insideRecord.inspectionNumber);
    expect(snapshot.inspections.items.map(({ inspectionNumber }) => inspectionNumber))
      .not.toContain(outsideRecord.inspectionNumber);
    expect(details.items.map(({ inspectionNumber }) => inspectionNumber))
      .toContain(insideRecord.inspectionNumber);
    expect(details.items.map(({ inspectionNumber }) => inspectionNumber))
      .not.toContain(outsideRecord.inspectionNumber);
  });

  it("marks missing or invalid Inspection dueDate incomplete without normalizing it", async () => {
    const record = sourceDataset.inspectionRecords.find(
      (item) => "trtid" in item.storeReference && item.storeReference.trtid === targetStore.trtid,
    )!;
    const dataset = {
      ...sourceDataset,
      inspectionRecords: sourceDataset.inspectionRecords.map((item) =>
        item === record ? { ...item, dueDate: "2026-02-30" as IsoDate } : item,
      ),
    };
    const result = await createMockEhsRepository(referenceDate, { dataset }).getKpiInspectionDetails({
      context,
      storeId: targetStore.trtid,
    });

    expect(result.availability).toBe("INCOMPLETE");
    expect(result.items.some(({ dueDate }) => dueDate === ("2026-02-30" as IsoDate)))
      .toBe(false);
  });

  it("preserves nullable open-text Inspection status without making coverage incomplete", async () => {
    const record = sourceDataset.inspectionRecords.find(
      (item) => "trtid" in item.storeReference && item.storeReference.trtid === targetStore.trtid,
    )!;
    const dataset = {
      ...sourceDataset,
      inspectionRecords: sourceDataset.inspectionRecords.map((item) =>
        item === record ? { ...item, status: null } : item,
      ),
    };
    const result = await createMockEhsRepository(referenceDate, { dataset }).getKpiInspectionDetails({
      context,
      storeId: targetStore.trtid,
    });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items.find((item) => item.inspectionNumber === record.inspectionNumber)?.status)
      .toBeNull();
  });

  it("does not expose removed Training requirement/completion source flags", () => {
    const record = sourceDataset.trainingRecords[0]!;
    expect(record).not.toHaveProperty("isRequired");
    expect(record).not.toHaveProperty("isFullyCompleted");
    expect(record.completionRate).toBeDefined();
    expect(record.incompletePeople).toBeDefined();
  });

  it("removes Inspection source month without changing Training or Drill month fields", () => {
    const inspection = sourceDataset.inspectionRecords[0]!;
    expect(inspection).not.toHaveProperty("month");
    expect(sourceDataset.trainingRecords[0]).toHaveProperty("month");
    expect(sourceDataset.drillRecords[0]).toHaveProperty("month");
  });
});
