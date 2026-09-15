import { describe, expect, it } from "vitest";
import type { ActionsViewMode } from "@/data/contracts/actions";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { mockStores } from "@/data/mock/stores";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiActionDrilldownQuery } from "@/features/kpi/kpi-action-drilldown";
import type { Month, RawActionRecord } from "@/types/ehs";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");

function context(
  startMonth: Month = "2026-07",
  endMonth: Month = "2026-09",
): EhsFilterContext {
  return {
    region: { kind: "ALL" },
    area: { kind: "ALL" },
    store: { kind: "ALL" },
    period: periodFromMonthRange(startMonth, endMonth)!,
  };
}

function query(
  viewMode: ActionsViewMode,
  filters: EhsFilterContext = context(),
) {
  return createMockEhsRepository(referenceDate).getActions({
    context: filters,
    viewMode,
    pageIndex: 0,
    pageSize: 100,
  });
}

function rawAction(
  Status: string,
  storeReference: RawActionRecord["storeReference"] = {
    trtid: mockStores[0].trtid,
    storeNameEn: mockStores[0].storeNameEn,
  },
  overrides: Partial<RawActionRecord> = {},
): RawActionRecord {
  return {
    actionId: `ACTION-${Status}`,
    storeReference,
    problem: "Problem",
    action: "Action",
    submittedBy: "Submitter",
    owner: "Owner",
    submittedDate: "2026-09-01T09:15:00",
    dueDate: "2026-09-30T18:00:00",
    closedDate: null,
    Status,
    ...overrides,
  };
}

describe("scoped Actions repository query", () => {
  it("resolves TRTID and English-name fallback to canonical storeId", async () => {
    const result = await query("ALL");
    const storeOneRecords = result.items.filter(
      (record) => record.storeId === mockStores[0].trtid,
    );

    expect(result.availability).toBe("AVAILABLE");
    expect(storeOneRecords).toHaveLength(6);
    expect(
      storeOneRecords.every(
        (record) => record.storeDisplayName === mockStores[0].storeNameCn,
      ),
    ).toBe(true);
  });

  it("applies Region, Area and canonical Store scopes", async () => {
    const base = context();
    const regionResult = await query("ALL", {
      ...base,
      region: { kind: "INCLUDE", values: ["北辰区"] },
    });
    const areaResult = await query("ALL", {
      ...base,
      region: { kind: "INCLUDE", values: ["北辰区"] },
      area: { kind: "INCLUDE", values: ["北辰一部"] },
    });
    const storeResult = await query("ALL", {
      ...base,
      store: { kind: "INCLUDE", values: [mockStores[2].trtid] },
    });

    expect(regionResult.items).toHaveLength(20);
    expect(areaResult.items).toHaveLength(9);
    expect(storeResult.items).toHaveLength(6);
    expect(
      storeResult.items.every(
        ({ storeId }) => storeId === mockStores[2].trtid,
      ),
    ).toBe(true);
  });

  it("uses Submitted Date and the half-open Period boundary", async () => {
    const august = await query("ALL", context("2026-08", "2026-08"));

    expect(august.items.map(({ submittedDate }) => submittedDate).sort()).toEqual([
      "2026-08-03T10:15:00+08:00",
      "2026-08-03T11:15:00+08:00",
      "2026-08-06T13:15:00+08:00",
      "2026-08-08T13:15:00+08:00",
      "2026-08-10T14:15:00+08:00",
      "2026-08-12T15:15:00+08:00",
      "2026-08-14T09:15:00+08:00",
    ]);
    expect(august.items).not.toContainEqual(
      expect.objectContaining({ submittedDate: "2026-09-01T08:15:00+08:00" }),
    );
  });

  it("marks a Period outside declared Action coverage incomplete", async () => {
    const result = await query("ALL", context("2026-10", "2026-10"));

    expect(result).toMatchObject({ availability: "INCOMPLETE", items: [] });
  });

  it("keeps unsupported Period unavailable to the shared Action detail query", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const filters = context("2026-10", "2026-10");

    const actions = await repository.getActions({
      ...buildKpiActionDrilldownQuery(filters, mockStores[0].trtid),
      pageSize: 100,
    });
    expect(actions).toMatchObject({ availability: "INCOMPLETE", items: [] });
  });

  it("returns only centralized OPEN states for Current Open", async () => {
    const result = await query("OPEN_ONLY");

    expect(result.items).toHaveLength(15);
    expect(result.items.every(({ recordState }) => recordState === "OPEN")).toBe(
      true,
    );
  });

  it("uses the same normalized OPEN query for KPI drill-down and Actions Current Open", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const filters: EhsFilterContext = {
      ...context(),
      store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
    };

    const actionsPage = await repository.getActions({
      context: filters,
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 100,
    });
    const drilldown = await repository.getActions({
      ...buildKpiActionDrilldownQuery(context(), mockStores[0].trtid),
      pageSize: 100,
    });
    expect(drilldown.items.map(({ actionId }) => actionId).sort()).toEqual(
      actionsPage.items.map(({ actionId }) => actionId).sort(),
    );
  });

  it("keeps KPI drill-down and Actions views aligned to Submitted Date", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned", undefined, {
          actionId: "HISTORICAL-OPEN",
          submittedDate: "2026-06-30T23:59:59",
        }),
        rawAction("In Progress", undefined, { actionId: "PERIOD-OPEN" }),
        rawAction("Closed", undefined, { actionId: "PERIOD-CLOSED" }),
        rawAction("Cancelled", undefined, { actionId: "PERIOD-CANCELLED" }),
      ],
    });
    const filters: EhsFilterContext = {
      ...context("2026-09", "2026-09"),
      store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
    };
    const kpiOpen = await repository.getActions({
      ...buildKpiActionDrilldownQuery(filters, mockStores[0].trtid),
      pageSize: 100,
    });
    const currentOpen = await repository.getActions({
      context: filters,
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 100,
    });
    const all = await repository.getActions({ context: filters, viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(kpiOpen.items).toEqual(currentOpen.items);
    expect(kpiOpen.items.map(({ actionId }) => actionId)).toEqual([
      "PERIOD-OPEN",
    ]);
    expect(all.items.map(({ actionId }) => actionId).sort()).toEqual([
      "PERIOD-CANCELLED",
      "PERIOD-CLOSED",
      "PERIOD-OPEN",
    ]);
  });

  it("applies the same Submitted Date Period to Current Open", async () => {
    const result = await query(
      "OPEN_ONLY",
      context("2026-09", "2026-09"),
    );

    expect(result.items.map(({ actionId }) => actionId).sort()).toEqual([
      "ACT-1000005",
      "ACT-1000006",
      "ACT-1000015",
      "ACT-1000016",
      "ACT-1000017",
    ]);
  });

  it("keeps CLOSED, EXCLUDED and UNKNOWN records in All", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned"),
        rawAction("Closed"),
        rawAction("Cancelled"),
        rawAction("Future Status"),
      ],
    });
    const result = await repository.getActions({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(result.items.map(({ recordState }) => recordState).sort()).toEqual([
      "CLOSED",
      "EXCLUDED",
      "OPEN",
      "UNKNOWN",
    ]);
    expect(result.items[3].sourceStatus).toEqual({
      kind: "UNKNOWN",
      value: "Future Status",
    });
  });

  it("marks conflicting Store references incomplete without choosing a store", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned", {
          trtid: mockStores[0].trtid,
          storeNameEn: mockStores[1].storeNameEn,
        }),
      ],
    });
    const result = await repository.getActions({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(result).toMatchObject({ availability: "INCOMPLETE", items: [] });
  });

  it("keeps a correct TRTID available when the raw English name is historical", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned", {
          trtid: mockStores[0].trtid,
          storeNameEn: "Historical Pine Store Name",
        }),
      ],
    });
    const result = await repository.getActions({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      storeId: mockStores[0].trtid,
      storeDisplayName: mockStores[0].storeNameCn,
    });
  });

  it("does not derive Action Closure Rate from detail statuses", async () => {
    const openRepository = createMockEhsRepository(referenceDate, {
      actionRecords: [rawAction("Assigned")],
    });
    const closedRepository = createMockEhsRepository(referenceDate, {
      actionRecords: [rawAction("Closed")],
    });

    expect((await openRepository.getKpiData(context())).actionClosureRates).toEqual(
      (await closedRepository.getKpiData(context())).actionClosureRates,
    );
  });

  it("sorts the full scoped result before repository pagination", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned", undefined, { actionId: "ACTION-C" }),
        rawAction("Assigned", undefined, { actionId: "ACTION-A" }),
        rawAction("Assigned", undefined, { actionId: "ACTION-B" }),
      ],
    });
    const result = await repository.getActions({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "actionId", direction: "asc" },
      pageIndex: 1,
      pageSize: 2,
    });

    expect(result).toMatchObject({ totalCount: 3, pageIndex: 1, pageSize: 2 });
    expect(result.items.map(({ actionId }) => actionId)).toEqual(["ACTION-C"]);
  });

  it.each([5, 7, 10] as const)("supports pageSize %i and clamps an invalid page", async (pageSize) => {
    const repository = createMockEhsRepository(referenceDate);
    const firstPage = await repository.getActions({
      context: context(), viewMode: "ALL", pageIndex: 0, pageSize,
    });
    const secondPage = await repository.getActions({
      context: context(), viewMode: "ALL", pageIndex: 1, pageSize,
    });
    const clamped = await repository.getActions({
      context: context(), viewMode: "ALL", pageIndex: 999, pageSize,
    });

    expect(firstPage.items).toHaveLength(pageSize);
    expect(secondPage.items.length).toBeGreaterThan(0);
    expect(new Set([...firstPage.items, ...secondPage.items].map(({ actionId }) => actionId)).size)
      .toBe(firstPage.items.length + secondPage.items.length);
    expect(clamped.pageIndex).toBe(Math.ceil(clamped.totalCount / pageSize) - 1);
  });
});
