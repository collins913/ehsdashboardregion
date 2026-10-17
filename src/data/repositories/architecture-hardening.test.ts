import { describe, expect, it } from "vitest";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import type { MockDataset } from "@/data/mock/mock-dataset";
import { MOCK_V1_EXPECTED_INSPECTION_TASKS, MOCK_V1_REQUIRED_TRAINING_ITEMS } from "@/data/mock/overview-required-sets";
import { createMockEhsRepository } from "./mock-ehs-repository";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { prepareOverviewResult } from "@/features/overview/prepare-overview-result";
import type { OverviewMetricId, OverviewScoreData } from "@/data/contracts/overview";
import type { DomainReason } from "@/data/contracts/domain-result";
import type { IsoDate, StoreReference } from "@/types/ehs";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");
const all = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } } as const;
const base = createKpiMockData(referenceDate);
const stores = base.stores.slice(0, 2);
const [storeA, storeB] = stores;
const month = "2026-01" as const;
const context = { ...all, period: periodFromMonthRange(month, month)! };
const isB = (reference: StoreReference) => "trtid" in reference && reference.trtid === storeB.trtid;
const certificateTypes = ["主要负责人安全生产培训合格证书-S", "急救员证", "熔化焊接与热切割作业", "安全驾驶内训师"];
function healthy(): MockDataset {
  return {
    ...base, stores,
    trainingRecords: base.supportedMonths.flatMap((month) => stores.flatMap((store) => MOCK_V1_REQUIRED_TRAINING_ITEMS.map((trainingName) =>
      ({ storeReference: { trtid: store.trtid }, month, trainingName, completionRate: 100, incompletePeople: [] })))),
    drillRecords: base.supportedMonths.flatMap((month) => stores.map((store) =>
      ({ storeReference: { trtid: store.trtid }, month, drillName: "演练", status: "已完成" }))),
    inspectionRecords: base.supportedMonths.flatMap((month) => stores.flatMap((store) => MOCK_V1_EXPECTED_INSPECTION_TASKS.map((inspectionName, index) =>
      ({ storeReference: { trtid: store.trtid }, inspectionName, inspectionNumber: `${store.trtid}-${month}-${index}`,
        dueDate: `${month}-10` as IsoDate, inspector: "检查人员", status: "已完成" })))),
    actionClosureRates: base.actionClosureRates.filter((record) => stores.some((store) => "trtid" in record.storeReference && record.storeReference.trtid === store.trtid))
      .map((record) => ({ ...record, value: 100 })),
    eventRecords: [],
    takeChargeRecords: base.supportedMonths.flatMap((month) => stores.map((store) =>
      ({ storeReference: { trtid: store.trtid }, submittedAt: `${month}-10T09:00:00` as const, submittedBy: "提交人员",
        tchId: `${store.trtid}-${month}`, summary: "提交", Status: "ClosedWithAction" }))),
    takeChargeAnnualAggregateFixtures: base.supportedMonths.flatMap((referenceMonth) => stores.map((store) =>
      ({ storeId: store.trtid, year: 2026, referenceMonth, submissionsNumerator: 20, submissionsDenominator: 2,
        participationNumerator: 8, participationDenominator: 10 }))),
    certificateRecords: stores.flatMap((store) => certificateTypes.map((type) =>
      ({ TRTID: store.trtid, "English Store Name": store.storeNameEn, "Certificate Type": type, "Expiry Date": "2030-01-01",
        Person: "员工", "Person Email": "employee@example.test", "Business Title": "员工" }))),
  };
}
const overview = (dataset: MockDataset) => createMockEhsRepository(referenceDate, { dataset }).getOverviewScoreData({ scope: all });
function score(data: OverviewScoreData, storeId: string) {
  return prepareOverviewResult({ referenceMonth: "2026-09", stores: data.stores, selectedStores: data.stores, attentionStores: data.attentionStores,
    contributions: data.contributions, context, requestedScope: all, availableMonths: data.months, sourceAvailability: data.availability })
    .scopeDetails.find((store) => store.id === storeId)?.score;
}

interface Mutation {
  name: string;
  metric: OverviewMetricId;
  reason: DomainReason;
  change: (data: MockDataset) => MockDataset;
}
const mutations: Mutation[] = [
  { name: "Training NaN", metric: "TRAINING", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    trainingRecords: data.trainingRecords.map((row) => isB(row.storeReference) && row.month === month ? { ...row, completionRate: Number.NaN } : row) }) },
  { name: "Training no scheduled records", metric: "TRAINING", reason: "ACHIEVED", change: (data) => ({ ...data,
    trainingRecords: data.trainingRecords.filter((row) => !(isB(row.storeReference) && row.month === month)) }) },
  { name: "Training incomplete", metric: "TRAINING", reason: "SOURCE_INCOMPLETE", change: (data) => ({ ...data,
    trainingRecords: data.trainingRecords.map((row) => isB(row.storeReference) && row.month === month ? { ...row, completionRate: null } : row) }) },
  { name: "Training identity conflict", metric: "TRAINING", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    trainingRecords: data.trainingRecords.map((row) => isB(row.storeReference) && row.month === month ? { ...row, storeReference: { trtid: storeB.trtid, storeNameEn: storeA.storeNameEn } } : row) }) },
  { name: "Drill missing status", metric: "DRILL", reason: "SOURCE_INCOMPLETE", change: (data) => ({ ...data,
    drillRecords: data.drillRecords.map((row) => isB(row.storeReference) && row.month === month ? { ...row, status: null } : row) }) },
  { name: "Drill malformed status", metric: "DRILL", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    drillRecords: data.drillRecords.map((row) => isB(row.storeReference) && row.month === month ? { ...row, status: 7 as unknown as string } : row) }) },
  { name: "Drill not completed", metric: "DRILL", reason: "RULE_NOT_MET", change: (data) => ({ ...data,
    drillRecords: data.drillRecords.filter((row) => !(isB(row.storeReference) && row.month === month)) }) },
  { name: "Inspection invalid date", metric: "INSPECTION", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    inspectionRecords: data.inspectionRecords.map((row) => isB(row.storeReference) && row.dueDate?.startsWith(month) ? { ...row, dueDate: "2026-02-30" as IsoDate } : row) }) },
  { name: "Inspection no scheduled records", metric: "INSPECTION", reason: "ACHIEVED", change: (data) => ({ ...data,
    inspectionRecords: data.inspectionRecords.filter((row) => !(isB(row.storeReference) && row.dueDate?.startsWith(month))) }) },
  { name: "Inspection malformed status", metric: "INSPECTION", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    inspectionRecords: data.inspectionRecords.map((row) => isB(row.storeReference) && row.dueDate?.startsWith(month) ? { ...row, status: 7 as unknown as string } : row) }) },
  { name: "Inspection missing status", metric: "INSPECTION", reason: "SOURCE_INCOMPLETE", change: (data) => ({ ...data,
    inspectionRecords: data.inspectionRecords.map((row) => isB(row.storeReference) && row.dueDate?.startsWith(month) ? { ...row, status: null } : row) }) },
  { name: "Actions NaN", metric: "ACTION_CLOSURE_RATE", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    actionClosureRates: data.actionClosureRates.map((row) => isB(row.storeReference) ? { ...row, value: Number.NaN } : row) }) },
  { name: "Actions malformed aggregate period", metric: "ACTION_CLOSURE_RATE", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    actionClosureRates: data.actionClosureRates.map((row) => isB(row.storeReference) ? { ...row, startInclusive: "invalid" as typeof row.startInclusive } : row) }) },
  { name: "Actions duplicate aggregate", metric: "ACTION_CLOSURE_RATE", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    actionClosureRates: [...data.actionClosureRates, ...data.actionClosureRates.filter((row) => isB(row.storeReference))] }) },
  { name: "ASTM invalid enum", metric: "ASTM_INCIDENT", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    eventRecords: [{ storeReference: { trtid: storeB.trtid }, eventId: "BAD-EVENT", eventType: "Agency", submittedBy: "人员",
      eventDate: "2026-01-10T09:00:00", Status: "Open", ASTMInjuryIllness: "unknown" as unknown as "No", EventDetail: { Description: "事件" } }] }) },
  { name: "Take Charge incomplete status", metric: "TAKE_CHARGE_CLOSE_RATE", reason: "SOURCE_INCOMPLETE", change: (data) => ({ ...data,
    takeChargeRecords: data.takeChargeRecords.map((row) => isB(row.storeReference) && row.submittedAt.startsWith(month) ? { ...row, Status: " " } : row) }) },
  { name: "Take Charge invalid date", metric: "TAKE_CHARGE_CLOSE_RATE", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    takeChargeRecords: data.takeChargeRecords.map((row) => isB(row.storeReference) && row.submittedAt.startsWith(month) ? { ...row, submittedAt: "invalid" as typeof row.submittedAt } : row) }) },
  { name: "YTD submissions per capita invalid", metric: "SUBMISSIONS_PER_CAPITA_YTD", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    takeChargeAnnualAggregateFixtures: data.takeChargeAnnualAggregateFixtures.map((row) => row.storeId === storeB.trtid && row.referenceMonth === month ? { ...row, submissionsNumerator: Number.NaN } : row) }) },
  { name: "YTD participation invalid", metric: "PARTICIPATION_RATE_YTD", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    takeChargeAnnualAggregateFixtures: data.takeChargeAnnualAggregateFixtures.map((row) => row.storeId === storeB.trtid && row.referenceMonth === month ? { ...row, participationDenominator: 0 } : row) }) },
  { name: "YTD missing source", metric: "PARTICIPATION_RATE_YTD", reason: "SOURCE_MISSING", change: (data) => ({ ...data,
    takeChargeAnnualAggregateFixtures: data.takeChargeAnnualAggregateFixtures.filter((row) => !(row.storeId === storeB.trtid && row.referenceMonth === month)) }) },
  ...certificateTypes.map((type, index): Mutation => ({ name: `Certificate invalid expiry ${type}`,
    metric: ["CERTIFICATE_SAFETY_HEALTH", "CERTIFICATE_FIRST_AID", "CERTIFICATE_SPECIAL_WORK", "CERTIFICATE_SAFE_DRIVING"][index] as OverviewMetricId,
    reason: "SOURCE_INVALID", change: (data) => ({ ...data, certificateRecords: data.certificateRecords.map((row) =>
      row.TRTID === storeB.trtid && row["Certificate Type"] === type ? { ...row, "Expiry Date": "invalid" } : row) }) })),
  { name: "Certificate identity conflict", metric: "CERTIFICATE_FIRST_AID", reason: "SOURCE_INVALID", change: (data) => ({ ...data,
    certificateRecords: data.certificateRecords.map((row) => row.TRTID === storeB.trtid && row["Certificate Type"] === "急救员证"
      ? { ...row, "English Store Name": storeA.storeNameEn } : row) }) },
  { name: "Certificate missing expiry", metric: "CERTIFICATE_FIRST_AID", reason: "SOURCE_MISSING", change: (data) => ({ ...data,
    certificateRecords: data.certificateRecords.map((row) => row.TRTID === storeB.trtid && row["Certificate Type"] === "急救员证"
      ? { ...row, "Expiry Date": null } : row) }) },
  { name: "Store B uncovered", metric: "TRAINING", reason: "SOURCE_INCOMPLETE", change: (data) => ({ ...data,
    coverage: { ...data.coverage, storeIds: data.coverage.storeIds.filter((id) => id !== storeB.trtid) } }) },
];

describe("Architecture Hardening V1", () => {
  it.each(mutations)("isolates Store B defects and preserves exact reason: $name", async ({ change, metric, reason }) => {
    const initial = await overview(healthy());
    const changed = await overview(change(healthy()));
    expect(changed.contributions.filter((row) => row.storeId === storeA.trtid)).toEqual(initial.contributions.filter((row) => row.storeId === storeA.trtid));
    expect(score(initial, storeA.trtid)).toBe(100);
    expect(score(changed, storeA.trtid)).toBe(100);
    expect(changed.contributions.find((row) => row.storeId === storeB.trtid && row.month === month && row.metricId === metric))
      .toMatchObject({ earnedPoints: reason === "ACHIEVED" ? 1 : 0, availablePoints: 1, reason });
    expect(changed.contributions).toHaveLength(stores.length * base.supportedMonths.length * 12);
  });

  it("keeps a known-month defect within the matching metric and month", async () => {
    const before = await overview(healthy());
    const after = await overview(mutations[0].change(healthy()));
    expect(after.contributions.filter((row) => !(row.storeId === storeB.trtid && row.month === month && row.metricId === "TRAINING")))
      .toEqual(before.contributions.filter((row) => !(row.storeId === storeB.trtid && row.month === month && row.metricId === "TRAINING")));
  });

  it.each([healthy, ...mutations.filter((row) => ["Training NaN", "Inspection malformed status", "Actions NaN"].includes(row.name)).map((row) => () => row.change(healthy()))])(
    "KPI and Overview consume the same monthly Domain Result", async (makeData) => {
      const repository = createMockEhsRepository(referenceDate, { dataset: makeData() });
      const snapshot = await repository.getKpiData(context);
      const data = await repository.getOverviewScoreData({ scope: all });
      const rows = buildKpiRows(context, snapshot);
      for (const domain of snapshot.domainResults) {
        const row = rows.find((row) => row.store.storeId === domain.store.storeId)!;
        for (const [metric, value, presentation] of [["TRAINING", domain.training, row.training], ["DRILL", domain.drill, row.drill],
          ["ACTION_CLOSURE_RATE", domain.actions, row.actions], ["INSPECTION", domain.inspections, row.inspections]] as const) {
          expect(presentation.result).toBe(value.result);
          expect(data.contributions.find((item) => item.storeId === domain.store.storeId && item.month === month && item.metricId === metric))
            .toMatchObject({ reason: value.reason, earnedPoints: value.result === "ACHIEVED" ? 1 : 0 });
        }
      }
    },
  );

  it("keeps Goals YTD fixed to the reference month across January, Q1, September and future Periods", async () => {
    const dataset = { ...healthy(), takeChargeAnnualAggregateFixtures: base.takeChargeAnnualAggregateFixtures.filter((row) => stores.some((store) => store.trtid === row.storeId)) };
    const repository = createMockEhsRepository(referenceDate, { dataset });
    const january = await repository.getTakeChargeGoals({ context });
    const current = dataset.takeChargeAnnualAggregateFixtures.filter((row) => row.referenceMonth === "2026-09");
    expect(january.annual.submissionsPerCapitaYtd.value).toBe(current.reduce((sum, row) => sum + row.submissionsNumerator, 0) / current.reduce((sum, row) => sum + row.submissionsDenominator, 0));
    expect(january.annual.participationRateYtd.value).toBe(current.reduce((sum, row) => sum + row.participationNumerator, 0) / current.reduce((sum, row) => sum + row.participationDenominator, 0) * 100);
    for (const period of [periodFromMonthRange("2026-01", "2026-03")!, periodFromMonthRange("2026-09", "2026-09")!, periodFromMonthRange("2027-01", "2027-01")!]) {
      expect((await repository.getTakeChargeGoals({ context: { ...all, period } })).annual).toEqual(january.annual);
    }
  });

  it("uses historical reference months for Overview while current Goals stays fixed", async () => {
    const data = healthy();
    const fixtures = data.takeChargeAnnualAggregateFixtures.map((row) => ({ ...row, submissionsNumerator: row.referenceMonth === month ? 2 : 20 }));
    const repository = createMockEhsRepository(referenceDate, { dataset: { ...data, takeChargeAnnualAggregateFixtures: fixtures } });
    const goals = await repository.getTakeChargeGoals({ context });
    const result = await repository.getOverviewScoreData({ scope: all });
    expect(goals.annual.submissionsPerCapitaYtd.result).toBe("ACHIEVED");
    expect(result.contributions.find((row) => row.storeId === storeA.trtid && row.month === month && row.metricId === "SUBMISSIONS_PER_CAPITA_YTD")?.reason).toBe("RULE_NOT_MET");
    expect(result.contributions.find((row) => row.storeId === storeA.trtid && row.month === "2026-09" && row.metricId === "SUBMISSIONS_PER_CAPITA_YTD")?.reason).toBe("ACHIEVED");
  });

  it("does not return Event rows for an invalid Period contract", async () => {
    const dataset = mutations.find((mutation) => mutation.name === "ASTM invalid enum")!.change(healthy());
    const repository = createMockEhsRepository(referenceDate, { dataset });
    const invalid = { ...context, period: { ...context.period, endExclusive: "2026-02-01T00:00:00" as typeof context.period.endExclusive } };
    const result = await repository.getEvents({ context: invalid, viewMode: "ALL", pageIndex: 0, pageSize: 100 });
    expect(result).toMatchObject({ availability: "INCOMPLETE", totalCount: 0, items: [] });
  });

  it("queries the union of selected and attention Stores without dropping selected Stores", async () => {
    const repository = createMockEhsRepository(referenceDate, { dataset: healthy() });
    const data = await repository.getOverviewScoreData({ scope: { ...all, store: { kind: "INCLUDE", values: [storeA.trtid] } },
      attentionScope: { ...all, store: { kind: "INCLUDE", values: [storeB.trtid] } } });
    expect(data.contributions).toHaveLength(2 * base.supportedMonths.length * 12);
    expect(data.contributions.filter((row) => row.storeId === storeA.trtid).every((row) => row.earnedPoints === 1)).toBe(true);
  });
});
