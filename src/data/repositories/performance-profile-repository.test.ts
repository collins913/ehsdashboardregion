import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodForMode } from "@/data/contracts/kpi-period";
import {
  getPerformanceMockDataset,
  PERFORMANCE_EVENT_TYPES,
  PERFORMANCE_STORE_COUNT,
} from "@/data/mock/performance";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");
const dataset = getPerformanceMockDataset(referenceDate);
const repository = createMockEhsRepository(referenceDate, { dataset });

function context(
  mode: "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" = "THIS_YEAR",
): EhsFilterContext {
  return {
    region: { kind: "ALL" },
    area: { kind: "ALL" },
    store: { kind: "ALL" },
    period: periodForMode(mode, referenceDate),
  };
}

describe("performance profile Repository behavior", () => {
  it("handles 500 Stores and keeps Period irrelevant to Store Master", async () => {
    const filters = await repository.getFilterStores();
    const year = await repository.getStores({ context: context("THIS_YEAR") });
    const month = await repository.getStores({ context: context("THIS_MONTH") });

    expect(filters).toHaveLength(500);
    expect(year.items).toHaveLength(500);
    expect(month.items).toEqual(year.items);
  });

  it("covers all Performance Stores in Environment scoped queries", async () => {
    const firstStore = dataset.stores[0];
    const all = await repository.getEnvironment({ context: context() });
    const region = await repository.getEnvironment({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: [firstStore.region] },
      },
    });
    const area = await repository.getEnvironment({
      context: {
        ...context(),
        area: { kind: "INCLUDE", values: [firstStore.area] },
      },
    });
    const store = await repository.getEnvironment({
      context: {
        ...context(),
        store: { kind: "INCLUDE", values: [firstStore.trtid] },
      },
    });

    expect(all.availability).toBe("AVAILABLE");
    expect(all.items).toHaveLength(PERFORMANCE_STORE_COUNT);
    expect(region.items).toHaveLength(
      dataset.stores.filter(({ region }) => region === firstStore.region).length,
    );
    expect(area.items).toHaveLength(
      dataset.stores.filter(({ area }) => area === firstStore.area).length,
    );
    expect(store.items.map(({ storeId }) => storeId)).toEqual([
      firstStore.trtid,
    ]);
    expect([region, area, store].every(({ availability }) => availability === "AVAILABLE"))
      .toBe(true);
  });

  it("filters, sorts and paginates Actions after the complete scope", async () => {
    const all = await repository.getActions({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "actionId", direction: "asc" },
      pageIndex: 0,
      pageSize: 10,
    });
    const open = await repository.getActions({
      context: context(),
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 10,
    });
    const corrected = await repository.getActions({
      context: context(),
      viewMode: "ALL",
      pageIndex: 99_999,
      pageSize: 10,
    });
    const firstStore = dataset.stores[0];
    const scoped = await repository.getActions({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: [firstStore.region] },
        area: { kind: "INCLUDE", values: [firstStore.area] },
        store: { kind: "INCLUDE", values: [firstStore.trtid] },
      },
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 10,
    });
    const currentMonth = await repository.getActions({
      context: context("THIS_MONTH"),
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 10,
    });

    expect(all.totalCount).toBe(8_000);
    expect(all.items).toHaveLength(10);
    expect(all.items[0].actionId).toBe("ACT-2000000");
    expect(open.totalCount).toBeLessThan(all.totalCount);
    expect(corrected.pageIndex).toBe(799);
    expect(scoped.totalCount).toBeGreaterThan(0);
    expect(scoped.items.every((record) => record.storeId === firstStore.trtid)).toBe(
      true,
    );
    expect(currentMonth.totalCount).toBeGreaterThan(0);
    expect(currentMonth.totalCount).toBeLessThan(all.totalCount);
  });

  it("keeps Event metadata independent of pagination and type filtering", async () => {
    const broad = await repository.getEvents({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "eventId", direction: "asc" },
      pageIndex: 0,
      pageSize: 5,
    });
    const secondPage = await repository.getEvents({
      context: context(),
      viewMode: "ALL",
      pageIndex: 1,
      pageSize: 7,
    });
    const typed = await repository.getEvents({
      context: context(),
      viewMode: "ALL",
      eventType: "Near Miss",
      pageIndex: 0,
      pageSize: 10,
    });

    expect(broad.totalCount).toBe(6_000);
    expect(broad.items).toHaveLength(5);
    expect(broad.items[0].eventId).toBe("EVT-10000");
    expect(secondPage.items).toHaveLength(7);
    expect(broad.availableEventTypes).toEqual([...PERFORMANCE_EVENT_TYPES].sort());
    expect(secondPage.availableEventTypes).toEqual(broad.availableEventTypes);
    expect(typed.availableEventTypes).toEqual(broad.availableEventTypes);
    expect(typed.items.every((record) => record.eventType === "Near Miss")).toBe(
      true,
    );
  });

  it("keeps Take Charge summaries independent of detail view and pagination", async () => {
    const summaryBefore = await repository.getTakeChargeGoals({
      context: context(),
    });
    const all = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "tchId", direction: "asc" },
      pageIndex: 0,
      pageSize: 10,
    });
    const open = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 7,
    });
    const allAgain = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "tchId", direction: "asc" },
      pageIndex: 0,
      pageSize: 10,
    });
    const summaryAfter = await repository.getTakeChargeGoals({
      context: context(),
    });

    expect(all.totalCount).toBe(8_000);
    expect(all.items[0].tchId).toBe("TCH-3000000");
    expect(open.totalCount).toBeLessThan(all.totalCount);
    expect(open.items).toHaveLength(7);
    expect(summaryAfter).toEqual(summaryBefore);
    expect(allAgain.items.map((record) => record.tchId)).toEqual(
      all.items.map((record) => record.tchId),
    );
  });

  it("returns complete KPI data for all 500 Stores without changing semantics", async () => {
    const kpiContext = context("THIS_QUARTER");
    const snapshot = await repository.getKpiData(kpiContext);
    const rows = buildKpiRows(kpiContext, snapshot);

    expect(snapshot.stores).toHaveLength(500);
    expect(snapshot.training.availability).toBe("AVAILABLE");
    expect(snapshot.drills.availability).toBe("AVAILABLE");
    expect(snapshot.inspections.availability).toBe("AVAILABLE");
    expect(snapshot.actionClosureRates.availability).toBe("AVAILABLE");
    expect(snapshot.events.availability).toBe("AVAILABLE");
    expect("actions" in snapshot).toBe(false);
    expect(rows).toHaveLength(500);
    expect(rows.every((row) => row.actions.value !== null)).toBe(true);
    expect(rows.every((row) => !("openActions" in row.actions))).toBe(true);
  });

  it("does not mutate shared source arrays while sorting queries", async () => {
    const before = {
      actions: dataset.actionRecords.slice(0, 3).map((record) => record.actionId),
      events: dataset.eventRecords.slice(0, 3).map((record) => record.eventId),
      takeCharge: dataset.takeChargeRecords
        .slice(0, 3)
        .map((record) => record.tchId),
    };

    await repository.getActions({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "actionId", direction: "desc" },
      pageIndex: 0,
      pageSize: 10,
    });
    await repository.getEvents({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "eventId", direction: "desc" },
      pageIndex: 0,
      pageSize: 10,
    });
    await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "tchId", direction: "desc" },
      pageIndex: 0,
      pageSize: 10,
    });

    expect({
      actions: dataset.actionRecords.slice(0, 3).map((record) => record.actionId),
      events: dataset.eventRecords.slice(0, 3).map((record) => record.eventId),
      takeCharge: dataset.takeChargeRecords
        .slice(0, 3)
        .map((record) => record.tchId),
    }).toEqual(before);
  });
});
