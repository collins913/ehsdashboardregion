import { describe, expect, it } from "vitest";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");
const allStores = { region: { kind: "ALL" as const }, area: { kind: "ALL" as const }, store: { kind: "ALL" as const } };

describe("Overview score data repository", () => {
  it("uses 2026 monthly domain results to produce exactly 12 contributions per Store × Month", async () => {
    const dataset = createKpiMockData(referenceDate);
    const repository = createMockEhsRepository(referenceDate, { dataset });
    const result = await repository.getOverviewScoreData({ scope: allStores });

    expect(result.stores).toHaveLength(dataset.stores.length);
    expect(result.months).toEqual(dataset.supportedMonths);
    expect(result.contributions).toHaveLength(dataset.stores.length * dataset.supportedMonths.length * 12);
    for (const store of result.stores) for (const month of result.months) {
      const rows = result.contributions.filter((row) => row.storeId === store.storeId && row.month === month);
      expect(rows).toHaveLength(12);
      expect(new Set(rows.map((row) => row.metricId)).size).toBe(12);
      expect(rows.reduce((sum, row) => sum + row.availablePoints, 0)).toBe(12);
    }

    for (const metricId of ["TRAINING", "INSPECTION"] as const) {
      const rows = result.contributions.filter((row) => row.metricId === metricId);
      expect(rows.some((row) => row.reason === "ACHIEVED" && row.earnedPoints === 1)).toBe(true);
      expect(rows.some((row) => row.reason === "RULE_NOT_MET" && row.earnedPoints === 0)).toBe(true);
      expect(rows.some((row) => row.reason === "SOURCE_MISSING" && row.earnedPoints === 0)).toBe(true);
      expect(rows.some((row) => row.reason === "SOURCE_INCOMPLETE" && row.earnedPoints === 0)).toBe(true);
      expect(rows.some((row) => row.reason === "SOURCE_INVALID" && row.earnedPoints === 0)).toBe(true);
      expect(rows.every((row) => row.reason !== "RULE_CONFIGURATION_MISSING")).toBe(true);
    }
    expect(result.contributions.some((row) => row.metricId === "ASTM_INCIDENT" && row.reason === "ACHIEVED" && row.earnedPoints === 1)).toBe(true);
    expect(result.contributions.some((row) => row.metricId === "ASTM_INCIDENT" && row.reason === "RULE_NOT_MET" && row.earnedPoints === 0)).toBe(true);
    for (const metricId of ["CERTIFICATE_SAFETY_HEALTH", "CERTIFICATE_FIRST_AID", "CERTIFICATE_SPECIAL_WORK", "CERTIFICATE_SAFE_DRIVING"] as const) {
      const rows = result.contributions.filter((row) => row.metricId === metricId);
      expect(rows.some((row) => row.reason === "ACHIEVED" && row.earnedPoints === 1)).toBe(true);
      expect(rows.some((row) => row.reason === "RULE_NOT_MET" && row.earnedPoints === 0)).toBe(true);
      expect(rows.some((row) => row.reason === "SOURCE_MISSING" && row.earnedPoints === 0)).toBe(true);
      expect(rows.some((row) => row.reason === "SOURCE_INVALID" && row.earnedPoints === 0)).toBe(true);
    }
    const certificateRows = result.contributions.filter((row) => row.metricId.startsWith("CERTIFICATE_"));
    expect(certificateRows.some((row) => row.reason === "ACHIEVED" && row.earnedPoints === 1)).toBe(true);
    expect(certificateRows.some((row) => row.reason === "RULE_NOT_MET" && row.earnedPoints === 0)).toBe(true);
    expect(certificateRows.every((row) => row.availablePoints === 1)).toBe(true);
  });

  it("uses RULE_CONFIGURATION_MISSING only when the runtime required-set provider is absent", async () => {
    const dataset = createKpiMockData(referenceDate);
    const repository = createMockEhsRepository(referenceDate, {
      dataset,
      overviewRequiredSetProvider: null,
    });
    const result = await repository.getOverviewScoreData({ scope: allStores });
    const firstStore = result.stores[0].storeId;
    const firstMonth = result.months[0];
    const rows = result.contributions.filter((row) => row.storeId === firstStore && row.month === firstMonth);

    expect(rows.find((row) => row.metricId === "TRAINING")).toMatchObject({ earnedPoints: 0, availablePoints: 1, reason: "RULE_CONFIGURATION_MISSING" });
    expect(rows.find((row) => row.metricId === "INSPECTION")).toMatchObject({ earnedPoints: 0, availablePoints: 1, reason: "RULE_CONFIGURATION_MISSING" });
    expect(rows).toHaveLength(12);
    expect(rows.reduce((sum, row) => sum + row.availablePoints, 0)).toBe(12);
  });
});
