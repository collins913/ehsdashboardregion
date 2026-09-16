import { describe, expect, it } from "vitest";
import { interpretShanghaiSourceDateTime } from "@/data/contracts/kpi-period";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { getMockDataset } from "@/data/mock/mock-dataset";
import {
  createPerformanceMockDataset,
  getPerformanceMockDataset,
  PERFORMANCE_ACTION_COUNT,
  PERFORMANCE_ACTION_STATUSES,
  PERFORMANCE_EVENT_COUNT,
  PERFORMANCE_EVENT_TYPES,
  PERFORMANCE_STORE_COUNT,
  PERFORMANCE_TAKE_CHARGE_COUNT,
  PERFORMANCE_TAKE_CHARGE_STATUSES,
} from "@/data/mock/performance";
import { resolveStoreReference } from "@/data/resolve-store-reference";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");

function spotIds(dataset: ReturnType<typeof createPerformanceMockDataset>) {
  const middleAction = Math.floor(dataset.actionRecords.length / 2);
  const middleEvent = Math.floor(dataset.eventRecords.length / 2);
  const middleTakeCharge = Math.floor(dataset.takeChargeRecords.length / 2);

  return {
    stores: [dataset.stores[0].trtid, dataset.stores[249].trtid, dataset.stores[499].trtid],
    actions: [
      dataset.actionRecords[0].actionId,
      dataset.actionRecords[middleAction].actionId,
      dataset.actionRecords.at(-1)?.actionId,
    ],
    events: [
      dataset.eventRecords[0].eventId,
      dataset.eventRecords[middleEvent].eventId,
      dataset.eventRecords.at(-1)?.eventId,
    ],
    takeCharge: [
      dataset.takeChargeRecords[0].tchId,
      dataset.takeChargeRecords[middleTakeCharge].tchId,
      dataset.takeChargeRecords.at(-1)?.tchId,
    ],
  };
}

describe("performance mock dataset", () => {
  it("creates the fixed V1 scale", () => {
    const dataset = createPerformanceMockDataset(referenceDate);

    expect(dataset.stores).toHaveLength(PERFORMANCE_STORE_COUNT);
    expect(dataset.actionRecords).toHaveLength(PERFORMANCE_ACTION_COUNT);
    expect(dataset.eventRecords).toHaveLength(PERFORMANCE_EVENT_COUNT);
    expect(dataset.takeChargeRecords).toHaveLength(
      PERFORMANCE_TAKE_CHARGE_COUNT,
    );
  });

  it("is deterministic and cached by reference month", () => {
    const first = createPerformanceMockDataset(referenceDate);
    const second = createPerformanceMockDataset(referenceDate);

    expect(spotIds(first)).toEqual(spotIds(second));
    expect(getPerformanceMockDataset(referenceDate)).toBe(
      getPerformanceMockDataset(referenceDate),
    );
  });

  it("keeps identifiers unique and Store references resolvable", () => {
    const dataset = createPerformanceMockDataset(referenceDate);

    expect(new Set(dataset.stores.map((store) => store.trtid)).size).toBe(
      PERFORMANCE_STORE_COUNT,
    );
    expect(new Set(dataset.stores.map((store) => store.storeNameEn)).size).toBe(
      PERFORMANCE_STORE_COUNT,
    );
    expect(new Set(dataset.stores.map((store) => store.storeNameCn)).size).toBe(
      PERFORMANCE_STORE_COUNT,
    );
    expect(new Set(dataset.actionRecords.map((record) => record.actionId)).size).toBe(
      PERFORMANCE_ACTION_COUNT,
    );
    expect(new Set(dataset.eventRecords.map((record) => record.eventId)).size).toBe(
      PERFORMANCE_EVENT_COUNT,
    );
    expect(new Set(dataset.takeChargeRecords.map((record) => record.tchId)).size).toBe(
      PERFORMANCE_TAKE_CHARGE_COUNT,
    );
    expect(
      dataset.actionRecords.every(
        (record) =>
          resolveStoreReference(record.storeReference, dataset.stores).kind ===
          "RESOLVED",
      ),
    ).toBe(true);
    expect(
      dataset.eventRecords.every(
        (record) =>
          resolveStoreReference(record.storeReference, dataset.stores).kind ===
          "RESOLVED",
      ),
    ).toBe(true);
  });

  it("covers statuses, Event Types, parseable dates and source aggregates", () => {
    const dataset = createPerformanceMockDataset(referenceDate);

    expect(new Set(dataset.actionRecords.map((record) => record.Status))).toEqual(
      new Set(PERFORMANCE_ACTION_STATUSES),
    );
    expect(new Set(dataset.eventRecords.map((record) => record.eventType))).toEqual(
      new Set(PERFORMANCE_EVENT_TYPES),
    );
    expect(new Set(dataset.takeChargeRecords.map((record) => record.Status))).toEqual(
      new Set(PERFORMANCE_TAKE_CHARGE_STATUSES),
    );
    expect(
      dataset.actionRecords.every(
        (record) => interpretShanghaiSourceDateTime(record.submittedDate) !== null,
      ),
    ).toBe(true);
    expect(
      dataset.eventRecords.every(
        (record) => interpretShanghaiSourceDateTime(record.eventDate) !== null,
      ),
    ).toBe(true);
    expect(
      dataset.takeChargeRecords.every(
        (record) => interpretShanghaiSourceDateTime(record.submittedAt) !== null,
      ),
    ).toBe(true);
    expect(dataset.actionClosureRates).toHaveLength(
      dataset.stores.length * dataset.coverage.actionAggregateScopes.length,
    );
    expect(dataset.takeChargeAnnualAggregateFixtures).toHaveLength(
      PERFORMANCE_STORE_COUNT,
    );
  });

  it("keeps Standard as the unchanged default dataset", () => {
    expect(getMockDataset("standard", referenceDate)).toEqual(
      createKpiMockData(referenceDate),
    );
  });
});
