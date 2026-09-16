import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { MockTakeChargeAnnualAggregateFixture } from "@/data/mock/take-charge";
import { mockStores } from "@/data/mock/stores";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import type { Month, TakeChargeRecord } from "@/types/ehs";

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

function takeCharge(
  tchId: string,
  Status: string,
  submittedAt: TakeChargeRecord["submittedAt"] =
    "2026-09-10T09:00:00",
  trtid = mockStores[0].trtid,
): TakeChargeRecord {
  return {
    storeReference: { trtid },
    tchId,
    submittedBy: "测试人员",
    submittedAt,
    summary: `${tchId} 完整摘要`,
    Status,
  };
}

describe("Take Charge Goals repository", () => {
  it("provides deterministic 2026 Q3 and current-year mock results", async () => {
    const summary = await createMockEhsRepository(referenceDate).getTakeChargeGoals({
      context: context(),
    });

    expect(summary.period).toMatchObject({
      availability: "AVAILABLE",
      submissionTotal: 48,
      closedCount: 24,
      closeRate: { value: 50, result: "NOT_ACHIEVED" },
    });
    expect(summary.annual.currentYear).toBe(2026);
    expect(summary.annual.averageSubmissionsYtd).toEqual({
      value: 5.5,
      result: "ACHIEVED",
    });
    expect(summary.annual.participationRateYtd.value).toBeCloseTo(
      (81 / 138) * 100,
    );
    expect(summary.annual.participationRateYtd.result).toBe("ACHIEVED");
  });

  it("computes period total and close rate from monthly numerator/denominator", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [
        takeCharge("JUL-CLOSED", "ClosedWithAction", "2026-07-02T09:00:00"),
        takeCharge("JUL-OPEN", "Submitted", "2026-07-03T09:00:00"),
        takeCharge("AUG-CLOSED", "Declined", "2026-08-03T09:00:00"),
        takeCharge("SEP-CLOSED", "ClosedWithoutAction"),
      ],
    });
    const filters = {
      ...context(),
      store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
    } satisfies EhsFilterContext;
    const summary = await repository.getTakeChargeGoals({ context: filters });

    expect(summary.period).toMatchObject({
      availability: "AVAILABLE",
      submissionTotal: 4,
      closedCount: 3,
      closeRate: { value: 75, result: "NOT_ACHIEVED" },
    });
  });

  it("returns a confirmed empty period without inventing 0% or 100%", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [],
    });
    const summary = await repository.getTakeChargeGoals({ context: context() });

    expect(summary.period).toMatchObject({
      availability: "CONFIRMED_EMPTY",
      submissionTotal: 0,
      closedCount: 0,
      closeRate: { value: null, result: "UNDETERMINED" },
    });
  });

  it("keeps unsupported source coverage incomplete", async () => {
    const summary = await createMockEhsRepository(referenceDate).getTakeChargeGoals({
      context: context("2026-10", "2026-10"),
    });

    expect(summary.period.availability).toBe("INCOMPLETE");
    expect(summary.period.submissionTotal).toBeNull();
  });

  it("keeps annual scope metrics independent from Global Period", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const month = await repository.getTakeChargeGoals({
      context: context("2026-09", "2026-09"),
    });
    const quarter = await repository.getTakeChargeGoals({ context: context() });

    expect(month.annual).toEqual(quarter.annual);
    expect(month.period).not.toEqual(quarter.period);
  });

  it("consumes the scoped Mock source aggregate without averaging Store results", async () => {
    const fixtures: MockTakeChargeAnnualAggregateFixture[] = [
      {
        storeId: mockStores[0].trtid,
        year: 2026,
        submissionsNumerator: 8,
        submissionsDenominator: 2,
        participationNumerator: 1,
        participationDenominator: 2,
      },
      {
        storeId: mockStores[1].trtid,
        year: 2026,
        submissionsNumerator: 90,
        submissionsDenominator: 10,
        participationNumerator: 9,
        participationDenominator: 10,
      },
    ];
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeAnnualAggregateFixtures: fixtures,
    });
    const filters = {
      ...context(),
      store: {
        kind: "INCLUDE",
        values: [mockStores[0].trtid, mockStores[1].trtid],
      },
    } satisfies EhsFilterContext;
    const annual = (await repository.getTakeChargeGoals({ context: filters })).annual;

    expect(annual.averageSubmissionsYtd.value).toBeCloseTo(98 / 12);
    expect(annual.participationRateYtd.value).toBeCloseTo((10 / 12) * 100);
    expect(annual.averageSubmissionsYtd.value).not.toBe(6.5);
    expect(annual.participationRateYtd.value).not.toBe(70);
  });

  it("applies Region, Area and canonical Store scopes", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const region = await repository.getTakeChargeGoals({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: [mockStores[0].region] },
      },
    });
    const area = await repository.getTakeChargeGoals({
      context: {
        ...context(),
        area: { kind: "INCLUDE", values: [mockStores[0].area] },
      },
    });
    const storeOnly = await repository.getTakeChargeGoals({
      context: {
        ...context(),
        store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
      },
    });
    const all = await repository.getTakeChargeGoals({ context: context() });

    expect(region.period.submissionTotal).toBe(16);
    expect(area.period.submissionTotal).toBe(8);
    expect(storeOnly.period.submissionTotal).toBe(4);
    expect(all.period.submissionTotal).toBe(48);
  });
});

describe("Take Charge record query", () => {
  it("defaults are enforced by callers while OPEN_ONLY excludes CLOSED and UNKNOWN", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [
        takeCharge("OPEN", "Submitted"),
        takeCharge("CLOSED", "ClosedWithAction"),
        takeCharge("UNKNOWN", "   "),
      ],
    });
    const openOnly = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 7,
    });
    const all = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 7,
    });

    expect(openOnly.items.map(({ tchId }) => tchId)).toEqual(["OPEN"]);
    expect(all.items.map(({ recordState }) => recordState)).toEqual(
      expect.arrayContaining(["OPEN", "CLOSED", "UNKNOWN"]),
    );
  });

  it("applies sorting to the full scoped result before pagination", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [
        takeCharge("D", "Submitted", "2026-09-04T09:00:00"),
        takeCharge("A", "Submitted", "2026-09-01T09:00:00"),
        takeCharge("C", "Submitted", "2026-09-03T09:00:00"),
        takeCharge("B", "Submitted", "2026-09-02T09:00:00"),
      ],
    });
    const ascendingSecondPage = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "tchId", direction: "asc" },
      pageIndex: 1,
      pageSize: 2,
    });
    const descendingFirstPage = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "tchId", direction: "desc" },
      pageIndex: 0,
      pageSize: 2,
    });

    expect(ascendingSecondPage.items.map(({ tchId }) => tchId)).toEqual([
      "C",
      "D",
    ]);
    expect(descendingFirstPage.items.map(({ tchId }) => tchId)).toEqual([
      "D",
      "C",
    ]);
    expect(ascendingSecondPage.totalCount).toBe(4);
  });

  it("keeps Goals summary independent from detail view mode and sorting", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const before = await repository.getTakeChargeGoals({ context: context() });

    await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "OPEN_ONLY",
      sorting: { key: "status", direction: "asc" },
      pageIndex: 0,
      pageSize: 7,
    });

    expect(await repository.getTakeChargeGoals({ context: context() })).toEqual(before);
  });

  it("uses TRTID resolution, Submitted At half-open Period, and pagination", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [
        takeCharge("BEFORE", "Submitted", "2026-06-30T23:59:59"),
        takeCharge("START", "Submitted", "2026-07-01T00:00:00"),
        takeCharge("SECOND", "Submitted", "2026-08-01T00:00:00"),
        takeCharge("END", "Submitted", "2026-10-01T00:00:00"),
      ],
    });
    const result = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      pageIndex: 1,
      pageSize: 1,
    });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.totalCount).toBe(2);
    expect(result.pageIndex).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].storeDisplayName).toBe(mockStores[0].storeNameCn);
    expect(result.items[0].submittedAt).toBe("2026-07-01T00:00:00+08:00");
  });

  it("clamps an invalid page and keeps extra fields definition-driven", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeFieldDefinitions: [
        { key: "category", label: "类别", valueType: "STRING", defaultVisible: false },
        { key: "summary", label: "冲突字段", valueType: "STRING", defaultVisible: false },
      ],
      takeChargeRecords: [
        {
          ...takeCharge("EXTRA", "Submitted"),
          extraFields: { category: "安全", hiddenRawField: "不得暴露" },
        },
      ],
    });
    const result = await repository.getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      pageIndex: 99,
      pageSize: 7,
    });

    expect(result.pageIndex).toBe(0);
    expect(result.fieldDefinitions.map(({ key }) => key)).toEqual(["category"]);
    expect(result.items[0].extraFields).toEqual({ category: "安全" });
  });

  it("marks unresolved TRTID and unsupported Period incomplete", async () => {
    const unresolved = await createMockEhsRepository(referenceDate, {
      takeChargeRecords: [takeCharge("BAD", "Submitted", undefined, "MISSING")],
    }).getTakeChargeRecords({
      context: context(),
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 7,
    });
    const unsupported = await createMockEhsRepository(referenceDate).getTakeChargeRecords({
      context: context("2026-10", "2026-10"),
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 7,
    });

    expect(unresolved.availability).toBe("INCOMPLETE");
    expect(unsupported.availability).toBe("INCOMPLETE");
  });

  it("does not treat a missing status as a reliable close-rate input", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [takeCharge("MISSING-STATUS", "   ")],
    });

    expect((await repository.getTakeChargeGoals({ context: context() })).period.availability)
      .toBe("INCOMPLETE");
    expect(
      (await repository.getTakeChargeRecords({
        context: context(),
        viewMode: "ALL",
        pageIndex: 0,
        pageSize: 7,
      })).availability,
    ).toBe("INCOMPLETE");
  });
});
