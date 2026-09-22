import type { MockTakeChargeAnnualAggregateFixture } from "@/data/mock/take-charge";
import { periodForMode } from "@/data/contracts/kpi-period";
import { createMockAggregateScopes } from "@/data/mock/kpi-mock-factory";
import type { MockDataset } from "@/data/mock/mock-dataset";
import { createMockKpiCoverage } from "@/data/mock/kpi-coverage";
import { createEnvironmentMockRecords } from "@/data/mock/environment-v1";
import { createMockCertificateRecords } from "@/data/mock/certificates";
import { mockPersonAt } from "@/data/mock/people";
import { mockStores } from "@/data/mock/stores";
import type {
  ActionClosureRateRecord,
  DrillRecord,
  EventRecord,
  InspectionRecord,
  IsoDateTime,
  Month,
  RawActionRecord,
  StoreMasterData,
  TakeChargeRecord,
  TrainingRecord,
} from "@/types/ehs";

export const PERFORMANCE_STORE_COUNT = 500;
export const PERFORMANCE_ACTION_COUNT = 8_000;
export const PERFORMANCE_EVENT_COUNT = 6_000;
export const PERFORMANCE_TAKE_CHARGE_COUNT = 8_000;

export const PERFORMANCE_EVENT_TYPES = [
  "Injury/Illness",
  "Auto Event",
  "General Liability",
  "Environmental",
  "Agency Contact",
  "Near Miss",
] as const;

export const PERFORMANCE_ACTION_STATUSES = [
  "Assigned",
  "In Progress",
  "In Review",
  "Sign Off",
  "Closed",
  "Cancelled",
] as const;

export const PERFORMANCE_TAKE_CHARGE_STATUSES = [
  "ClosedWithAction",
  "ClosedWithoutAction",
  "Declined",
  "Submitted",
  "InProgress",
  "PendingReview",
] as const;

const gravityNameStems = [
  "云川",
  "澜州",
  "星原",
  "辰川",
  "云岚",
  "澜川",
  "霁川",
  "云州",
] as const;

const gravityPlaceStems = [
  "北岸",
  "望川里",
  "东岭",
  "云谷",
  "南庭",
  "天际城",
  "北辰新城",
  "望澜里",
] as const;

const gravityEnglishStems = [
  "Yunchuan",
  "Lanzhou",
  "Xingyuan",
  "Chenchuan",
  "Yunlan",
  "Lanchuan",
  "Jichuan",
  "Yunzhou",
] as const;

const gravityEnglishPlaces = [
  "Northbank",
  "Wangchuanli",
  "Dongling",
  "Cloud Valley",
  "South Court",
  "Sky City",
  "Beichen New Town",
  "Wanglanli",
] as const;

const organizationScopes = Array.from(
  new Map(
    mockStores.map((store) => [
      `${store.region}:${store.area}`,
      { region: store.region, area: store.area },
    ]),
  ).values(),
);

function sourceDateTime(month: Month, index: number): IsoDateTime {
  const day = 1 + (index % 27);
  const hour = 8 + ((index * 5) % 11);
  const minute = (index * 17) % 60;

  return `${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function performanceStores(): readonly StoreMasterData[] {
  return Array.from({ length: PERFORMANCE_STORE_COUNT }, (_, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    const scope = organizationScopes[index % organizationScopes.length];
    const nameStem = gravityNameStems[index % gravityNameStems.length];
    const placeStem = gravityPlaceStems[(index * 3) % gravityPlaceStems.length];
    const englishStem = gravityEnglishStems[index % gravityEnglishStems.length];
    const englishPlace =
      gravityEnglishPlaces[(index * 3) % gravityEnglishPlaces.length];

    return {
      ...scope,
      storeNameCn: `${nameStem}${placeStem}${sequence}号引力场中心`,
      storeNameEn: `${englishStem} ${englishPlace} Gravity Field Center ${sequence}`,
      trtid: `PERF-${String(index + 1).padStart(4, "0")}`,
      regionOwner: `区域负责人${Math.floor((index % organizationScopes.length) / 2)}`,
      regionOwnerEmail: `region.${Math.floor((index % organizationScopes.length) / 2)}@example.test`,
      areaOwner: `小区负责人${index % organizationScopes.length}`,
      areaOwnerEmail: `area.${index % organizationScopes.length}@example.test`,
      manager: mockPersonAt(index),
      managerEmail: `manager.${index + 1}@example.test`,
      ehsAmbassador: mockPersonAt(index + 5),
      ehsAmbassadorEmail: `ehss.${index + 1}@example.test`,
    };
  });
}

function performanceActions(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly RawActionRecord[] {
  return Array.from({ length: PERFORMANCE_ACTION_COUNT }, (_, index) => {
    const store = stores[index % stores.length];
    const month = months[(index * 7) % months.length];
    const status = PERFORMANCE_ACTION_STATUSES[index % PERFORMANCE_ACTION_STATUSES.length];
    const submittedDate = sourceDateTime(month, index);

    return {
      actionId: `ACT-${2_000_000 + index}`,
      storeReference: { trtid: store.trtid, storeNameEn: store.storeNameEn },
      problem: `门店现场检查发现第 ${index + 1} 项设备、流程或作业环境问题。`,
      action: `完成第 ${index + 1} 项整改，保留验证记录并由负责人确认。`,
      submittedBy: mockPersonAt(index + 1),
      owner: mockPersonAt(index + 4),
      submittedDate,
      dueDate: sourceDateTime(month, index + 9),
      closedDate:
        status === "Closed" ? sourceDateTime(month, index + 3) : null,
      Status: status,
      sourceReference: {
        sourceSystem: "Performance Mock Actions",
        sourceRecordId: `PERF-ACTION-${index + 1}`,
      },
    };
  });
}

function performanceEvents(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly EventRecord[] {
  return Array.from({ length: PERFORMANCE_EVENT_COUNT }, (_, index) => {
    const store = stores[(index * 11) % stores.length];
    const eventType = PERFORMANCE_EVENT_TYPES[index % PERFORMANCE_EVENT_TYPES.length];
    const month = months[(index * 5) % months.length];

    return {
      eventId: `EVT-${String(10_000 + index).padStart(5, "0")}`,
      storeReference: { trtid: store.trtid, storeNameEn: store.storeNameEn },
      eventType,
      submittedBy: mockPersonAt(index + 2),
      eventDate: sourceDateTime(month, index + 13),
      EventDetail: {
        Description: `第 ${index + 1} 条 ${eventType} 事件记录，用于验证大规模筛选、排序、分页和长文本展示。`,
      },
      Status: index % 4 === 3 ? "Closed" : "Open",
      ASTMInjuryIllness:
        eventType === "Injury/Illness" && index % 5 === 0 ? "Yes" : "No",
      sourceReference: {
        sourceSystem: "Performance Mock Events",
        sourceRecordId: `PERF-EVENT-${index + 1}`,
      },
    };
  });
}

function performanceTakeCharge(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly TakeChargeRecord[] {
  return Array.from({ length: PERFORMANCE_TAKE_CHARGE_COUNT }, (_, index) => {
    const store = stores[(index * 13) % stores.length];
    const month = months[(index * 7) % months.length];

    return {
      storeReference: { trtid: store.trtid },
      tchId: `TCH-${3_000_000 + index}`,
      submittedBy: mockPersonAt(index + 3),
      submittedAt: sourceDateTime(month, index + 19),
      summary: `第 ${index + 1} 项门店安全、流程或工作环境改进建议。`,
      Status:
        PERFORMANCE_TAKE_CHARGE_STATUSES[
          index % PERFORMANCE_TAKE_CHARGE_STATUSES.length
        ],
      sourceReference: {
        sourceSystem: "Performance Mock Take Charge",
        sourceRecordId: `PERF-TCH-${index + 1}`,
      },
    };
  });
}

function performanceTraining(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly TrainingRecord[] {
  return stores.flatMap((store, storeIndex) =>
    months.map((month, monthIndex) => ({
      storeReference: { trtid: store.trtid },
      month,
      trainingName: `月度必修培训 ${monthIndex + 1}`,
      isRequired: true,
      isFullyCompleted: (storeIndex + monthIndex) % 11 !== 0,
    })),
  );
}

function performanceDrills(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly DrillRecord[] {
  return stores.flatMap((store, storeIndex) =>
    months.map((month, monthIndex) => ({
      storeReference: { trtid: store.trtid },
      month,
      drillName: `月度应急演练 ${monthIndex + 1}`,
      isCompleted: (storeIndex + monthIndex) % 13 !== 0,
    })),
  );
}

function performanceInspections(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly InspectionRecord[] {
  return stores.flatMap((store, storeIndex) =>
    months.map((period, monthIndex) => ({
      storeReference: { trtid: store.trtid },
      period,
      isRequired: true,
      isCompleted: (storeIndex + monthIndex) % 17 !== 0,
    })),
  );
}

function performanceActionClosureRates(
  stores: readonly StoreMasterData[],
  scopes: readonly MockDataset["supportedPeriod"][],
): readonly ActionClosureRateRecord[] {
  return stores.flatMap((store, storeIndex) =>
    scopes.map((scope, scopeIndex) => ({
      storeReference: { trtid: store.trtid },
      startInclusive: scope.startInclusive,
      endExclusive: scope.endExclusive,
      value: 55 + ((storeIndex * 17 + scopeIndex * 11) % 46),
      sourceReference: {
        sourceSystem: "Performance Mock Action Aggregates",
        sourceRecordId: `PERF-ACTION-RATE-${storeIndex + 1}-${scopeIndex + 1}`,
      },
    })),
  );
}

function performanceAnnualAggregateFixtures(
  stores: readonly StoreMasterData[],
  year: number,
): readonly MockTakeChargeAnnualAggregateFixture[] {
  return stores.map((store, index) => ({
    storeId: store.trtid,
    year,
    submissionsNumerator: 30 + (index % 25),
    submissionsDenominator: 8 + (index % 4),
    participationNumerator: 5 + (index % 6),
    participationDenominator: 12,
  }));
}

export function createPerformanceMockDataset(referenceDate: Date): MockDataset {
  const supportedPeriod = periodForMode("THIS_YEAR", referenceDate);
  const supportedMonths = supportedPeriod.includedMonths;
  const actionAggregateScopes = createMockAggregateScopes(supportedMonths);
  const stores = performanceStores();

  return {
    stores,
    supportedPeriod,
    supportedMonths,
    coverage: createMockKpiCoverage(
      stores.map((store) => store.trtid),
      supportedPeriod,
      actionAggregateScopes,
    ),
    trainingRecords: performanceTraining(stores, supportedMonths),
    drillRecords: performanceDrills(stores, supportedMonths),
    inspectionRecords: performanceInspections(stores, supportedMonths),
    actionClosureRates: performanceActionClosureRates(
      stores,
      actionAggregateScopes,
    ),
    actionRecords: performanceActions(stores, supportedMonths),
    eventRecords: performanceEvents(stores, supportedMonths),
    environmentRecords: createEnvironmentMockRecords(stores, stores.length),
    certificateRecords: createMockCertificateRecords(stores, referenceDate),
    takeChargeRecords: performanceTakeCharge(stores, supportedMonths),
    takeChargeAnnualAggregateFixtures: performanceAnnualAggregateFixtures(
      stores,
      Number(supportedMonths[0].slice(0, 4)),
    ),
    takeChargeFieldDefinitions: [],
  };
}

const performanceDatasetCache = new Map<string, MockDataset>();

export function getPerformanceMockDataset(referenceDate: Date): MockDataset {
  const referenceMonth = periodForMode("THIS_MONTH", referenceDate).includedMonths[0];
  const cached = performanceDatasetCache.get(referenceMonth);

  if (cached !== undefined) {
    return cached;
  }

  const dataset = createPerformanceMockDataset(referenceDate);
  performanceDatasetCache.set(referenceMonth, dataset);
  return dataset;
}
