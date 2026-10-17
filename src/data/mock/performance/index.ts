import { createMockTakeChargeAnnualAggregateFixturesForStores } from "@/data/mock/take-charge";
import { periodForMode } from "@/data/contracts/kpi-period";
import { createMockAggregateScopes } from "@/data/mock/kpi-mock-factory";
import type { MockDataset } from "@/data/mock/mock-dataset";
import { createMockKpiCoverage } from "@/data/mock/kpi-coverage";
import { createEnvironmentMockRecords } from "@/data/mock/environment-v1";
import { createMockCertificateRecords } from "@/data/mock/certificates";
import { mockPeople, mockPersonAt } from "@/data/mock/people";
import { MOCK_V1_REQUIRED_TRAINING_ITEMS } from "@/data/mock/overview-required-sets";
import { mockStores } from "@/data/mock/stores";
import { createMockInspectionRecordsForStores } from "@/data/mock/inspections";
import { createMockTrainingRecordsForStores } from "@/data/mock/training";
import type {
  ActionClosureRateRecord,
  DrillRecord,
  EventRecord,
  IsoDateTime,
  Month,
  RawActionRecord,
  StoreMasterData,
  TakeChargeRecord,
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

// Keyed sampling keeps unrelated fields independent and repeatable across reloads.
function sample(key: string): number {
  let value = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    value = Math.imul(value ^ key.charCodeAt(index), 16777619);
  }
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function sampleIndex(key: string, length: number): number {
  return Math.floor(sample(key) * length);
}

function monthPicker(domain: string, months: readonly [Month, ...Month[]]) {
  const weights = months.map((month) => 0.25 + sample(`${domain}:volume:${month}`) * 2);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return (index: number): Month => {
    if (index < months.length) return months[index];
    let remaining = sample(`${domain}:month:${index}`) * total;
    for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
      remaining -= weights[monthIndex];
      if (remaining < 0) return months[monthIndex];
    }
    return months[months.length - 1];
  };
}

// Synthetic source variation, not an EHS score or achievement rule.
function monthlyActivity(store: StoreMasterData, month: Month): number {
  return sample(`month:${month}`) * 0.35 + sample(`area:${store.region}:${store.area}:${month}`) * 0.65;
}

function requirementScenario(domain: string, store: StoreMasterData, month: Month): number {
  const value = sample(`${domain}:${store.trtid}:${month}`);
  // Retain missing, invalid and null examples without saturating the annual view.
  if (value < 0.01) return 2;
  if (value < 0.02) return 3;
  if (value < 0.03) return 4;
  return value < 0.03 + (0.3 + monthlyActivity(store, month) * 0.65) * 0.97 ? 0 : 1;
}

function sourceDateTime(month: Month, index: number, dayOffset = 0): IsoDateTime {
  const key = `date:${month}:${index}`;
  const day = 1 + sampleIndex(`${key}:day`, 18) + dayOffset;
  const hour = 8 + sampleIndex(`${key}:hour`, 11);
  const minute = sampleIndex(`${key}:minute`, 60);

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
  const pickMonth = monthPicker("actions", months);
  return Array.from({ length: PERFORMANCE_ACTION_COUNT }, (_, index) => {
    const store = stores[index < stores.length ? index : sampleIndex(`actions:store:${index}`, stores.length)];
    const month = pickMonth(index);
    const status = PERFORMANCE_ACTION_STATUSES[sampleIndex(`actions:status:${index}`, PERFORMANCE_ACTION_STATUSES.length)];
    const submittedDate = sourceDateTime(month, index);

    return {
      actionId: `ACT-${2_000_000 + index}`,
      storeReference: { trtid: store.trtid, storeNameEn: store.storeNameEn },
      problem: `门店现场检查发现第 ${index + 1} 项设备、流程或作业环境问题。`,
      action: `完成第 ${index + 1} 项整改，保留验证记录并由负责人确认。`,
      submittedBy: mockPersonAt(index + 1),
      owner: mockPersonAt(index + 4),
      submittedDate,
      dueDate: sourceDateTime(month, index, 9),
      closedDate:
        status === "Closed" ? sourceDateTime(month, index, 3) : null,
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
  const pickMonth = monthPicker("events", months);
  const typeCoverageCount = months.length * PERFORMANCE_EVENT_TYPES.length;
  return Array.from({ length: PERFORMANCE_EVENT_COUNT }, (_, index) => {
    const store = stores[index < stores.length ? index : sampleIndex(`events:store:${index}`, stores.length)];
    const eventType = PERFORMANCE_EVENT_TYPES[
      index < typeCoverageCount
        ? index % PERFORMANCE_EVENT_TYPES.length
        : sampleIndex(`events:type:${index}`, PERFORMANCE_EVENT_TYPES.length)
    ];
    const month = index < typeCoverageCount
      ? months[Math.floor(index / PERFORMANCE_EVENT_TYPES.length)]
      : pickMonth(index);

    return {
      eventId: `EVT-${String(10_000 + index).padStart(5, "0")}`,
      storeReference: { trtid: store.trtid, storeNameEn: store.storeNameEn },
      eventType,
      submittedBy: mockPersonAt(index + 2),
      eventDate: sourceDateTime(month, index + 13),
      EventDetail: {
        Description: `第 ${index + 1} 条 ${eventType} 事件记录，用于验证大规模筛选、排序、分页和长文本展示。`,
      },
      Status: sample(`events:status:${index}`) < 0.4 ? "Closed" : "Open",
      ASTMInjuryIllness:
        eventType === "Injury/Illness" && sample(`events:astm:${index}`) < 0.2 ? "Yes" : "No",
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
  const pickMonth = monthPicker("take-charge", months);
  return Array.from({ length: PERFORMANCE_TAKE_CHARGE_COUNT }, (_, index) => {
    const store = stores[index < stores.length ? index : sampleIndex(`take-charge:store:${index}`, stores.length)];
    const month = pickMonth(index);
    const closed = sample(`take-charge:closed:${index}`) < monthlyActivity(store, month);
    const statusIndex = closed
      ? sampleIndex(`take-charge:status:${index}`, 2)
      : 2 + sampleIndex(`take-charge:status:${index}`, 4);

    return {
      storeReference: { trtid: store.trtid },
      tchId: `TCH-${3_000_000 + index}`,
      submittedBy: mockPersonAt(index + 3),
      submittedAt: sourceDateTime(month, index + 19),
      summary: `第 ${index + 1} 项门店安全、流程或工作环境改进建议。`,
      Status: PERFORMANCE_TAKE_CHARGE_STATUSES[statusIndex],
      sourceReference: {
        sourceSystem: "Performance Mock Take Charge",
        sourceRecordId: `PERF-TCH-${index + 1}`,
      },
    };
  });
}

function performanceDrills(
  stores: readonly StoreMasterData[],
  months: readonly [Month, ...Month[]],
): readonly DrillRecord[] {
  return stores.flatMap((store) =>
    months.map((month, monthIndex) => ({
      storeReference: { trtid: store.trtid },
      month,
      drillName: `月度应急演练 ${monthIndex + 1}`,
      status: sample(`drills:${store.trtid}:${month}`) < 0.55 + monthlyActivity(store, month) * 0.4 ? "已完成" : "未完成",
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
      value: Math.min(100, Math.round(
        55 + monthlyActivity(store, scope.includedMonths[scope.includedMonths.length - 1]) * 35
        + sample(`action-rate:${store.trtid}:${scope.startInclusive}:${scope.endExclusive}`) * 15,
      )),
      sourceReference: {
        sourceSystem: "Performance Mock Action Aggregates",
        sourceRecordId: `PERF-ACTION-RATE-${storeIndex + 1}-${scopeIndex + 1}`,
      },
    })),
  );
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
    trainingRecords: createMockTrainingRecordsForStores(stores, supportedMonths, (storeIndex, monthIndex) =>
      requirementScenario("training", stores[storeIndex], supportedMonths[monthIndex])).map((record) => {
        // Targeted long-text fixture: 云川北岸001号引力场中心, October 2026.
        const wrappingExample = record.month === "2026-10"
          && "trtid" in record.storeReference && record.storeReference.trtid === "PERF-0001"
          && record.trainingName === MOCK_V1_REQUIRED_TRAINING_ITEMS[0];
        return wrappingExample ? { ...record, completionRate: 84, incompletePeople: mockPeople } : record;
      }),
    drillRecords: performanceDrills(stores, supportedMonths),
    inspectionRecords: createMockInspectionRecordsForStores(stores, supportedMonths, (storeIndex, monthIndex) =>
      requirementScenario("inspections", stores[storeIndex], supportedMonths[monthIndex])),
    actionClosureRates: performanceActionClosureRates(
      stores,
      actionAggregateScopes,
    ),
    actionRecords: performanceActions(stores, supportedMonths),
    eventRecords: performanceEvents(stores, supportedMonths),
    environmentRecords: createEnvironmentMockRecords(stores, stores.length),
    certificateRecords: createMockCertificateRecords(stores, referenceDate),
    takeChargeRecords: performanceTakeCharge(stores, supportedMonths),
    takeChargeAnnualAggregateFixtures: createMockTakeChargeAnnualAggregateFixturesForStores(
      stores,
      supportedMonths,
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
