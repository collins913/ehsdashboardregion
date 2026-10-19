import { describe, expect, it } from "vitest";
import { unwrapQueryOutcome } from "@/data/contracts/query-result";
import { evaluateTrainingRecords, evaluateInspectionRecords } from "@/lib/rules/training-inspection-rules";
import { evaluateDrillPerformance, sourceStatusCompletion } from "@/lib/rules/performance-rules";
import { evaluateAstmOccurrence } from "@/lib/rules/event-rules";
import { demoKpiContext, demoKpiRows, queryDemoKpiDetails } from "./kpi-ui-fixture";

// Formal rules validate the prepared fixtures only in tests; they are not imported by the preview.
const inputFor = (storeId: string) => ({ referenceDateIso: "2026-09-11T00:00:00+08:00", query: { context: demoKpiContext, storeId } });

describe.each(demoKpiRows)("KPI preview $store.storeId", (row) => {
  it("matches training details to the displayed result and record tags", async () => {
    const details = unwrapQueryOutcome(await queryDemoKpiDetails.training(inputFor(row.store.storeId)));
    expect(details.availability).toBe(row.training.availability);
    const records = details.items.map((record) => ({ ...record, storeId: row.store.storeId }));
    expect(evaluateTrainingRecords(records, details.availability).result).toBe(row.training.result);
    for (const record of records) {
      expect(evaluateTrainingRecords([record], "AVAILABLE").result).toBe(record.completionResult);
    }
  });

  it("matches drills across every included month", async () => {
    const details = unwrapQueryOutcome(await queryDemoKpiDetails.drill(inputFor(row.store.storeId)));
    expect(details.availability).toBe(row.drill.availability);
    const months = details.availability === "UNAVAILABLE" ? null : demoKpiContext.period.includedMonths.map((month) => ({
      drillCompletion: details.items.filter((record) => record.month === month).map((record) => sourceStatusCompletion(record.status)),
    }));
    expect(evaluateDrillPerformance(months)).toBe(row.drill.result);
    for (const record of details.items) {
      expect(evaluateDrillPerformance([{ drillCompletion: [sourceStatusCompletion(record.status)] }])).toBe(record.completionResult);
    }
  });

  it("matches inspection details, including confirmed empty scopes", async () => {
    const details = unwrapQueryOutcome(await queryDemoKpiDetails.inspections(inputFor(row.store.storeId)));
    expect(details.availability).toBe(row.inspections.availability);
    const records = details.items.map((record) => ({ ...record, month: "2026-09" as const, storeId: row.store.storeId }));
    expect(evaluateInspectionRecords(records, details.availability).result).toBe(row.inspections.result);
    for (const record of records) {
      expect(evaluateInspectionRecords([record], "AVAILABLE").result).toBe(record.completionResult);
    }
  });

  it("shows ASTM records only for the selected store and matches its result", async () => {
    const details = unwrapQueryOutcome(await queryDemoKpiDetails.astmEvents(inputFor(row.store.storeId)));
    expect(details.availability).toBe(row.astmEvents.availability);
    expect(evaluateAstmOccurrence(details.items)).toBe(row.astmEvents.result);
    expect(details.items.every((record) => record.storeId === row.store.storeId)).toBe(true);
  });
});

it.each(["training", "drill", "inspections", "astmEvents"] as const)("does not return another store's %s details for an unknown fixture", async (category) => {
  await expect(queryDemoKpiDetails[category](inputFor("unknown-store"))).resolves.toEqual({ availability: "UNAVAILABLE", items: [] });
});

it("retains the completed, pending, incomplete, unavailable and empty preview scenarios", () => {
  expect(demoKpiRows.some((row) => row.training.result === "ACHIEVED")).toBe(true);
  expect(demoKpiRows.some((row) => row.training.result === "NOT_ACHIEVED")).toBe(true);
  expect(demoKpiRows.some((row) => row.training.availability === "INCOMPLETE")).toBe(true);
  expect(demoKpiRows.some((row) => row.drill.availability === "UNAVAILABLE")).toBe(true);
  expect(demoKpiRows.some((row) => row.inspections.availability === "CONFIRMED_EMPTY" && row.inspections.result === "ACHIEVED")).toBe(true);
});
