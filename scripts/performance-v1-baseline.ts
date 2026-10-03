import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodForMode } from "@/data/contracts/kpi-period";
import {
  createPerformanceMockDataset,
  getPerformanceMockDataset,
} from "@/data/mock/performance";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { prepareOverviewResult } from "@/features/overview/prepare-overview-result";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");
const sampleCount = 10;

type Timing = {
  name: string;
  median: number;
  p95: number;
  min: number;
  max: number;
};

function stats(name: string, samples: readonly number[]): Timing {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (value: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)];

  return {
    name,
    median:
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)],
    p95: percentile(0.95),
    min: sorted[0],
    max: sorted.at(-1)!,
  };
}

function measureSync(name: string, operation: () => void): Timing {
  const samples = Array.from({ length: sampleCount }, () => {
    const start = performance.now();
    operation();
    return performance.now() - start;
  });

  return stats(name, samples);
}

async function measureAsync(
  name: string,
  operation: () => Promise<unknown>,
): Promise<Timing> {
  await operation();
  const samples: number[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const start = performance.now();
    await operation();
    samples.push(performance.now() - start);
  }

  return stats(name, samples);
}

function printTiming(timing: Timing) {
  console.log(
    `${timing.name}: median ${timing.median.toFixed(2)} ms | p95 ${timing.p95.toFixed(2)} ms | min ${timing.min.toFixed(2)} ms | max ${timing.max.toFixed(2)} ms`,
  );
}

describe("Performance V1 baseline", () => {
  it(
    "reports deterministic dataset and Repository query timings",
    async () => {
      const coldConstruction = measureSync("Dataset cold construction", () => {
        createPerformanceMockDataset(referenceDate);
      });
      const dataset = getPerformanceMockDataset(referenceDate);
      const coldRepositoryStart = performance.now();
      createMockEhsRepository(referenceDate, { dataset });
      const coldRepositoryPreparation = stats("Mock Repository cold preparation", [
        performance.now() - coldRepositoryStart,
      ]);
      const repositoryConstruction = measureSync(
        "Mock Repository cached construction / obtain",
        () => {
          createMockEhsRepository(referenceDate, {
            dataset: getPerformanceMockDataset(referenceDate),
          });
        },
      );
      const repository = createMockEhsRepository(referenceDate, { dataset });
      const broadContext: EhsFilterContext = {
        region: { kind: "ALL" },
        area: { kind: "ALL" },
        store: { kind: "ALL" },
        period: periodForMode("THIS_YEAR", referenceDate),
      };
      const store = dataset.stores[0];
      const scopedContext: EhsFilterContext = {
        ...broadContext,
        region: { kind: "INCLUDE", values: [store.region] },
        area: { kind: "INCLUDE", values: [store.area] },
        store: { kind: "INCLUDE", values: [store.trtid] },
      };
      const kpiSnapshot = await repository.getKpiData(broadContext);
      buildKpiRows(broadContext, kpiSnapshot);
      const overviewScope = {
        region: broadContext.region,
        area: broadContext.area,
        store: broadContext.store,
      };
      const overviewData = await repository.getOverviewScoreData({ scope: overviewScope });
      const overviewViewModel = prepareOverviewResult({
        stores: overviewData.attentionStores,
        selectedStores: overviewData.stores,
        attentionStores: overviewData.attentionStores,
        contributions: overviewData.contributions,
        context: broadContext,
        requestedScope: overviewScope,
        availableMonths: overviewData.months,
        sourceAvailability: overviewData.availability,
      });
      const timings = [
        coldConstruction,
        coldRepositoryPreparation,
        repositoryConstruction,
        await measureAsync("getFilterStores", () => repository.getFilterStores()),
        await measureAsync("getStores", () =>
          repository.getStores({ context: broadContext }),
        ),
        await measureAsync("Actions broad query", () =>
          repository.getActions({
            context: broadContext,
            viewMode: "ALL",
            sorting: { key: "submittedDate", direction: "desc" },
            pageIndex: 0,
            pageSize: 10,
          }),
        ),
        await measureAsync("Actions drill-down query", () =>
          repository.getActions({
            context: scopedContext,
            viewMode: "OPEN_ONLY",
            pageIndex: 0,
            pageSize: Number.MAX_SAFE_INTEGER,
          }),
        ),
        await measureAsync("Events broad query", () =>
          repository.getEvents({
            context: broadContext,
            viewMode: "ALL",
            sorting: { key: "eventDate", direction: "desc" },
            pageIndex: 0,
            pageSize: 10,
          }),
        ),
        await measureAsync("Events Event-Type query", () =>
          repository.getEvents({
            context: broadContext,
            viewMode: "ALL",
            eventType: "Near Miss",
            pageIndex: 0,
            pageSize: 10,
          }),
        ),
        await measureAsync("Take Charge broad query", () =>
          repository.getTakeChargeRecords({
            context: broadContext,
            viewMode: "ALL",
            sorting: { key: "submittedAt", direction: "desc" },
            pageIndex: 0,
            pageSize: 10,
          }),
        ),
        await measureAsync("Take Charge scoped query", () =>
          repository.getTakeChargeRecords({
            context: scopedContext,
            viewMode: "OPEN_ONLY",
            pageIndex: 0,
            pageSize: 10,
          }),
        ),
        await measureAsync("Take Charge summary", () =>
          repository.getTakeChargeGoals({ context: broadContext }),
        ),
        await measureAsync("KPI query", () => repository.getKpiData(broadContext)),
        measureSync("KPI builder", () => {
          buildKpiRows(broadContext, kpiSnapshot);
        }),
        await measureAsync("KPI complete server pipeline", async () => {
          const snapshot = await repository.getKpiData(broadContext);
          buildKpiRows(broadContext, snapshot);
        }),
        await measureAsync("Overview source + contribution pipeline", () =>
          repository.getOverviewScoreData({ scope: overviewScope }),
        ),
        await measureAsync("Overview aggregation + view model", async () =>
          prepareOverviewResult({
            stores: overviewData.attentionStores,
            selectedStores: overviewData.stores,
            attentionStores: overviewData.attentionStores,
            contributions: overviewData.contributions,
            context: broadContext,
            requestedScope: overviewScope,
            availableMonths: overviewData.months,
            sourceAvailability: overviewData.availability,
          }),
        ),
      ];
      const kpiRows = buildKpiRows(broadContext, kpiSnapshot);
      const kpiPayloadBytes = Buffer.byteLength(JSON.stringify(kpiRows));
      const overviewPayloadBytes = Buffer.byteLength(JSON.stringify(overviewData));
      const overviewViewModelBytes = Buffer.byteLength(JSON.stringify(overviewViewModel));

      console.log("\nDataset:");
      console.log(`Stores: ${dataset.stores.length}`);
      console.log(`Actions: ${dataset.actionRecords.length}`);
      console.log(`Events: ${dataset.eventRecords.length}`);
      console.log(`Training records: ${dataset.trainingRecords.length}`);
      console.log(`Inspection records: ${dataset.inspectionRecords.length}`);
      console.log(`Take Charge: ${dataset.takeChargeRecords.length}\n`);
      console.log(`KPI rows: ${kpiRows.length}`);
      console.log(`KPI serialized payload: ${kpiPayloadBytes} bytes\n`);
      console.log(`Overview months: ${overviewData.months.length}`);
      console.log(`Overview contributions: ${overviewData.contributions.length}`);
      console.log(`Overview serialized source payload: ${overviewPayloadBytes} bytes\n`);
      console.log(`Overview serialized prepared result: ${overviewViewModelBytes} bytes\n`);
      timings.forEach(printTiming);

      expect(dataset.stores).toHaveLength(500);
      expect(overviewData.contributions).toHaveLength(dataset.stores.length * dataset.supportedMonths.length * 12);
      const denominatorByStoreMonth = new Map<string, number>();
      for (const row of overviewData.contributions) {
        const key = `${row.storeId}\u0000${row.month}`;
        denominatorByStoreMonth.set(key, (denominatorByStoreMonth.get(key) ?? 0) + row.availablePoints);
      }
      for (const store of overviewData.stores) for (const month of overviewData.months) {
        expect(denominatorByStoreMonth.get(`${store.storeId}\u0000${month}`)).toBe(12);
      }
      expect(timings.every((timing) => Number.isFinite(timing.median))).toBe(true);
    },
    120_000,
  );
});
