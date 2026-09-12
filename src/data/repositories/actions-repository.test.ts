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
): RawActionRecord {
  return {
    actionId: `ACTION-${Status}`,
    storeReference,
    problem: "Problem",
    action: "Action",
    submittedBy: "Submitter",
    owner: "Owner",
    submittedDate: "2026-09-01",
    dueDate: "2026-09-30",
    closedDate: null,
    Status,
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
      "2026-08-03",
      "2026-08-03",
      "2026-08-08",
      "2026-08-06",
      "2026-08-10",
      "2026-08-12",
      "2026-08-14",
    ]);
    expect(august.items).not.toContainEqual(
      expect.objectContaining({ submittedDate: "2026-09-01" }),
    );
  });

  it("marks a Period outside declared Action coverage incomplete", () => {
    const result = query("ALL", context("2026-10", "2026-10"));

    expect(result).toEqual({ availability: "INCOMPLETE", items: [] });
  });

  it("returns only centralized OPEN states for Current Open", () => {
    const result = query("OPEN_ONLY");

    expect(result.items).toHaveLength(15);
    expect(result.items.every(({ recordState }) => recordState === "OPEN")).toBe(
      true,
    );
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
