import { describe, expect, it } from "vitest";
import type { ActionsViewMode } from "@/data/contracts/actions";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { mockStores } from "@/data/mock/stores";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import type { Month, RawActionRecord } from "@/types/ehs";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");

function context(
  startMonth: Month = "2026-07",
  endMonth: Month = "2026-09",
): KpiFilterContext {
  return {
    region: { kind: "ALL" },
    area: { kind: "ALL" },
    store: { kind: "ALL" },
    period: periodFromMonthRange(startMonth, endMonth)!,
  };
}

function query(
  viewMode: ActionsViewMode,
  filters: KpiFilterContext = context(),
) {
  return createMockEhsRepository(referenceDate).getActions({
    context: filters,
    viewMode,
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
  it("resolves TRTID and English-name fallback to canonical storeId", () => {
    const result = query("ALL");
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

  it("applies Region, Area and canonical Store scopes", () => {
    const base = context();
    const regionResult = query("ALL", {
      ...base,
      region: { kind: "INCLUDE", values: ["北辰区"] },
    });
    const areaResult = query("ALL", {
      ...base,
      region: { kind: "INCLUDE", values: ["北辰区"] },
      area: { kind: "INCLUDE", values: ["北辰一部"] },
    });
    const storeResult = query("ALL", {
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

  it("uses Submitted Date and the half-open Period boundary", () => {
    const august = query("ALL", context("2026-08", "2026-08"));

    expect(august.items.map(({ submittedDate }) => submittedDate)).toEqual([
      "2026-08-03T10:15:00+08:00",
      "2026-08-03T11:15:00+08:00",
      "2026-08-08T13:15:00+08:00",
      "2026-08-06T13:15:00+08:00",
      "2026-08-10T14:15:00+08:00",
      "2026-08-12T15:15:00+08:00",
      "2026-08-14T09:15:00+08:00",
    ]);
    expect(august.items).not.toContainEqual(
      expect.objectContaining({ submittedDate: "2026-09-01T08:15:00+08:00" }),
    );
  });

  it("marks a Period outside declared Action coverage incomplete", () => {
    const result = query("ALL", context("2026-10", "2026-10"));

    expect(result).toEqual({ availability: "INCOMPLETE", items: [] });
  });

  it("keeps unsupported Period availability identical for both Action consumers", () => {
    const repository = createMockEhsRepository(referenceDate);
    const filters = context("2026-10", "2026-10");

    expect(repository.getKpiData(filters).actions).toEqual(
      repository.getActions({ context: filters, viewMode: "OPEN_ONLY" }),
    );
  });

  it("returns only centralized OPEN states for Current Open", () => {
    const result = query("OPEN_ONLY");

    expect(result.items).toHaveLength(15);
    expect(result.items.every(({ recordState }) => recordState === "OPEN")).toBe(
      true,
    );
  });

  it("uses the same normalized OPEN query for KPI drill-down and Actions Current Open", () => {
    const repository = createMockEhsRepository(referenceDate);
    const filters: KpiFilterContext = {
      ...context(),
      store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
    };

    expect(repository.getKpiData(filters).actions).toEqual(
      repository.getActions({ context: filters, viewMode: "OPEN_ONLY" }),
    );
  });

  it("keeps KPI drill-down and Actions views aligned to Submitted Date", () => {
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
    const filters: KpiFilterContext = {
      ...context("2026-09", "2026-09"),
      store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
    };
    const kpiOpen = repository.getKpiData(filters).actions;
    const currentOpen = repository.getActions({
      context: filters,
      viewMode: "OPEN_ONLY",
    });
    const all = repository.getActions({ context: filters, viewMode: "ALL" });

    expect(kpiOpen).toEqual(currentOpen);
    expect(kpiOpen.items.map(({ actionId }) => actionId)).toEqual([
      "PERIOD-OPEN",
    ]);
    expect(all.items.map(({ actionId }) => actionId)).toEqual([
      "PERIOD-OPEN",
      "PERIOD-CLOSED",
      "PERIOD-CANCELLED",
    ]);
  });

  it("applies the same Submitted Date Period to Current Open", () => {
    const result = query(
      "OPEN_ONLY",
      context("2026-09", "2026-09"),
    );

    expect(result.items.map(({ actionId }) => actionId)).toEqual([
      "ACT-1000005",
      "ACT-1000006",
      "ACT-1000015",
      "ACT-1000016",
      "ACT-1000017",
    ]);
  });

  it("keeps CLOSED, EXCLUDED and UNKNOWN records in All", () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned"),
        rawAction("Closed"),
        rawAction("Cancelled"),
        rawAction("Future Status"),
      ],
    });
    const result = repository.getActions({ context: context(), viewMode: "ALL" });

    expect(result.items.map(({ recordState }) => recordState)).toEqual([
      "OPEN",
      "CLOSED",
      "EXCLUDED",
      "UNKNOWN",
    ]);
    expect(result.items[3].sourceStatus).toEqual({
      kind: "UNKNOWN",
      value: "Future Status",
    });
  });

  it("marks conflicting Store references incomplete without choosing a store", () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned", {
          trtid: mockStores[0].trtid,
          storeNameEn: mockStores[1].storeNameEn,
        }),
      ],
    });
    const result = repository.getActions({ context: context(), viewMode: "ALL" });

    expect(result).toEqual({ availability: "INCOMPLETE", items: [] });
  });

  it("keeps a correct TRTID available when the raw English name is historical", () => {
    const repository = createMockEhsRepository(referenceDate, {
      actionRecords: [
        rawAction("Assigned", {
          trtid: mockStores[0].trtid,
          storeNameEn: "Historical Pine Store Name",
        }),
      ],
    });
    const result = repository.getActions({ context: context(), viewMode: "ALL" });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      storeId: mockStores[0].trtid,
      storeDisplayName: mockStores[0].storeNameCn,
    });
  });

  it("does not derive Action Closure Rate from detail statuses", () => {
    const openRepository = createMockEhsRepository(referenceDate, {
      actionRecords: [rawAction("Assigned")],
    });
    const closedRepository = createMockEhsRepository(referenceDate, {
      actionRecords: [rawAction("Closed")],
    });

    expect(openRepository.getKpiData(context()).actionClosureRates).toEqual(
      closedRepository.getKpiData(context()).actionClosureRates,
    );
  });
});
