import { areaScopeId } from "@/data/contracts/kpi";
import { describe, expect, it } from "vitest";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import type { MockTakeChargeAnnualAggregateFixture } from "@/data/mock/take-charge";
import { mockStores } from "@/data/mock/stores";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { isTakeChargeClosedForRate } from "@/lib/rules/take-charge-rules";
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
  it("preserves orphan diagnostics in summary without changing valid Store scoring or annual aggregates", async () => {
    const good = takeCharge("HEALTHY", "ClosedWithAction");
    const clean = createMockEhsRepository(referenceDate, { takeChargeRecords: [good] });
    const changed = createMockEhsRepository(referenceDate, { takeChargeRecords: [good, takeCharge("ORPHAN", "Submitted", "2026-09-10T09:00:00", "MISSING-STORE")] });
    const filters = context("2026-09", "2026-09");
    const summary = await changed.getTakeChargeGoals({ context: filters });
    const details = await changed.getTakeChargeRecords({ context: filters, viewMode: "ALL", pageIndex: 0, pageSize: 10 });
    expect(details.availability).toBe("INCOMPLETE");
    expect(summary.period).toMatchObject({
      availability: "INCOMPLETE", submissionTotal: null, closedCount: null,
      closeRate: { value: null, result: "UNDETERMINED", reason: "SOURCE_INCOMPLETE" },
    });
    expect(summary.annual).toEqual((await clean.getTakeChargeGoals({ context: filters })).annual);
    const scope = { region: filters.region, area: filters.area, store: filters.store };
    expect((await changed.getOverviewScoreData({ scope })).contributions).toEqual((await clean.getOverviewScoreData({ scope })).contributions);
    expect(await changed.getTakeChargeGoals({ context: context("2026-08", "2026-08") }))
      .toEqual(await clean.getTakeChargeGoals({ context: context("2026-08", "2026-08") }));
  });

  it("does not turn a wholly unresolvable source into a confirmed empty period", async () => {
    const repository = createMockEhsRepository(referenceDate, { takeChargeRecords: [takeCharge("ORPHAN", "Submitted", "2026-09-31T09:00:00", "MISSING-STORE")] });
    const summary = await repository.getTakeChargeGoals({ context: context() });
    expect(summary.period).toMatchObject({ availability: "INCOMPLETE", submissionTotal: null, closeRate: { value: null, result: "UNDETERMINED" } });
  });

  it("provides deterministic 2026 Q3 and current-year mock results", async () => {
    const dataset = createKpiMockData(referenceDate);
    const summary = await createMockEhsRepository(referenceDate).getTakeChargeGoals({
      context: context(),
    });
    const periodRecords = dataset.takeChargeRecords.filter(({ submittedAt }) => submittedAt >= "2026-07-01" && submittedAt < "2026-10-01");
    const annualSourceRows = dataset.takeChargeAnnualAggregateFixtures.filter(({ referenceMonth }) => referenceMonth === "2026-09");
    const submissionsNumerator = annualSourceRows.reduce((sum, row) => sum + row.submissionsNumerator, 0);
    const submissionsDenominator = annualSourceRows.reduce((sum, row) => sum + row.submissionsDenominator, 0);
    const participationNumerator = annualSourceRows.reduce((sum, row) => sum + row.participationNumerator, 0);
    const participationDenominator = annualSourceRows.reduce((sum, row) => sum + row.participationDenominator, 0);

    expect(summary.period).toMatchObject({
      availability: "AVAILABLE",
      submissionTotal: periodRecords.length,
      closedCount: periodRecords.filter(({ Status }) => isTakeChargeClosedForRate(Status)).length,
      closeRate: { value: (periodRecords.filter(({ Status }) => isTakeChargeClosedForRate(Status)).length / periodRecords.length) * 100, result: "NOT_ACHIEVED" },
    });
    expect(summary.annual.currentYear).toBe(2026);
    expect(summary.annual.submissionsPerCapitaYtd).toEqual({
      value: submissionsNumerator / submissionsDenominator,
      result: submissionsNumerator / submissionsDenominator >= 4 ? "ACHIEVED" : "NOT_ACHIEVED",
      reason: submissionsNumerator / submissionsDenominator >= 4 ? "ACHIEVED" : "RULE_NOT_MET",
    });
    expect(summary.annual.participationRateYtd.value).toBeCloseTo(
      (participationNumerator / participationDenominator) * 100,
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
        referenceMonth: "2026-09",
        submissionsNumerator: 8,
        submissionsDenominator: 2,
        participationNumerator: 1,
        participationDenominator: 2,
      },
      {
        storeId: mockStores[1].trtid,
        year: 2026,
        referenceMonth: "2026-09",
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

    expect(annual.submissionsPerCapitaYtd.value).toBeCloseTo(98 / 12);
    expect(annual.participationRateYtd.value).toBeCloseTo((10 / 12) * 100);
    expect(annual.submissionsPerCapitaYtd.value).not.toBe(6.5);
    expect(annual.participationRateYtd.value).not.toBe(70);
  });

  it("applies Region, Area and canonical Store scopes", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const data = createKpiMockData(referenceDate);
    const periodRecords = (storeIds: ReadonlySet<string>) => data.takeChargeRecords.filter((record) => {
      const month = record.submittedAt.slice(0, 7);
      const trtid = "trtid" in record.storeReference ? record.storeReference.trtid : "";
      return storeIds.has(trtid) && month >= "2026-07" && month <= "2026-09";
    });
    const regionStoreIds = new Set(mockStores.filter(({ region }) => region === mockStores[0].region).map(({ trtid }) => trtid));
    const areaStoreIds = new Set(mockStores.filter(({ area }) => area === mockStores[0].area).map(({ trtid }) => trtid));
    const allStoreIds = new Set(mockStores.map(({ trtid }) => trtid));
    const region = await repository.getTakeChargeGoals({
      context: {
        ...context(),
        region: { kind: "INCLUDE", values: [mockStores[0].region] },
      },
    });
    const area = await repository.getTakeChargeGoals({
      context: {
        ...context(),
        area: { kind: "INCLUDE", values: [areaScopeId(mockStores[0].region, mockStores[0].area)] },
      },
    });
    const storeOnly = await repository.getTakeChargeGoals({
      context: {
        ...context(),
        store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
      },
    });
    const all = await repository.getTakeChargeGoals({ context: context() });

    expect(region.period.submissionTotal).toBe(periodRecords(regionStoreIds).length);
    expect(area.period.submissionTotal).toBe(periodRecords(areaStoreIds).length);
    expect(storeOnly.period.submissionTotal).toBe(4);
    expect(all.period.submissionTotal).toBe(periodRecords(allStoreIds).length);
  });
});

describe("Take Charge record query", () => {
  it("uses the shared English-name fallback when TRTID is unavailable", async () => {
    const record = takeCharge("EN-FALLBACK", "Submitted");
    const repository = createMockEhsRepository(referenceDate, {
      takeChargeRecords: [
        { ...record, storeReference: { storeNameEn: mockStores[0].storeNameEn } },
      ],
    });
    const result = await repository.getTakeChargeRecords({
      context: {
        ...context(),
        store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
      },
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 10,
    });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items.map(({ tchId }) => tchId)).toEqual(["EN-FALLBACK"]);
  });

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
