import type { TakeChargeAnnualSource, TakeChargeFieldDefinition } from "@/data/contracts/take-charge";
import { mockStores } from "@/data/mock/stores";
import { mockPersonAt } from "@/data/mock/people";
import type { Month, StoreId, TakeChargeRecord } from "@/types/ehs";

// Mock-only source fixture. Its inputs must not become a production aggregate contract.
export interface MockTakeChargeAnnualAggregateFixture {
  storeId: StoreId;
  year: number;
  referenceMonth: Month;
  submissionsNumerator: number;
  submissionsDenominator: number;
  participationNumerator: number;
  participationDenominator: number;
}

export function createMockTakeChargeAnnualAggregateReader(
  fixtures: readonly MockTakeChargeAnnualAggregateFixture[],
) {
  const index = new Map<string, MockTakeChargeAnnualAggregateFixture[]>();
  for (const fixture of fixtures) {
    const key = `${fixture.year}\u0000${fixture.referenceMonth}\u0000${fixture.storeId}`;
    const items = index.get(key) ?? [];
    items.push(fixture);
    index.set(key, items);
  }
  return (year: number, selectedStoreIds: readonly StoreId[], referenceMonth: Month): TakeChargeAnnualSource => {
    const selected = selectedStoreIds.map((storeId) => index.get(`${year}\u0000${referenceMonth}\u0000${storeId}`) ?? []);
    const metric = (numerator: "submissionsNumerator" | "participationNumerator", denominator: "submissionsDenominator" | "participationDenominator", scale: number) => {
      if (selected.some((items) => items.length > 1)) return { value: null, reason: "SOURCE_INVALID" as const };
      const records = selected.flat();
      if (records.some((row) => !Number.isFinite(row[numerator]) || row[numerator] < 0 ||
        !Number.isFinite(row[denominator]) || row[denominator] <= 0 || (scale === 100 && row[numerator] > row[denominator]))) {
        return { value: null, reason: "SOURCE_INVALID" as const };
      }
      if (selectedStoreIds.length === 0 || selected.some((items) => items.length === 0)) return { value: null, reason: "SOURCE_MISSING" as const };
      return { value: records.reduce((sum, row) => sum + row[numerator], 0) /
        records.reduce((sum, row) => sum + row[denominator], 0) * scale };
    };
    return { submissionsPerCapitaYtd: metric("submissionsNumerator", "submissionsDenominator", 1),
      participationRateYtd: metric("participationNumerator", "participationDenominator", 100) };
  };
}

const TAKE_CHARGE_STATUSES = [
  "ClosedWithAction",
  "ClosedWithoutAction",
  "Declined",
  "Submitted",
  "InProgress",
  "PendingReview",
] as const;

function recordNumber(monthIndex: number, storeIndex: number, offset: number) {
  return monthIndex * 100 + storeIndex * 2 + offset + 1;
}

function takeChargeId(monthIndex: number, storeIndex: number, offset: number) {
  const sequence = recordNumber(monthIndex, storeIndex, offset);
  const value = 1_000_000 + ((sequence * 7_919 + 842_753) % 9_000_000);

  return `TCH-${value}`;
}

function submittedAt(
  month: Month,
  day: number,
  sequence: number,
): `${string}T${string}` {
  const hour = 8 + ((sequence * 5) % 10);
  const minute = 11 + ((sequence * 17) % 47);

  return `${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export const mockTakeChargeFieldDefinitions =
  [] satisfies readonly TakeChargeFieldDefinition[];

export function createMockTakeChargeRecords(
  months: readonly [Month, ...Month[]],
): readonly TakeChargeRecord[] {
  return months.flatMap((month, monthIndex) =>
    mockStores.flatMap((store, storeIndex) => {
      const baseStatus =
        TAKE_CHARGE_STATUSES[(monthIndex + storeIndex) % TAKE_CHARGE_STATUSES.length];
      const records: TakeChargeRecord[] = [
        {
          storeReference: { trtid: store.trtid },
          tchId: takeChargeId(monthIndex, storeIndex, 0),
          submittedBy: mockPersonAt(storeIndex + monthIndex),
          submittedAt: submittedAt(
            month,
            (storeIndex % 18) + 3,
            recordNumber(monthIndex, storeIndex, 0),
          ),
          summary:
            storeIndex % 3 === 0
              ? "发现门店日常作业中的改进机会，并提出可执行的现场安全优化建议。"
              : "提交一项现场安全与运营改进建议。",
          Status: baseStatus,
          sourceReference: {
            sourceSystem: "Mock Take Charge",
            sourceRecordId: `TCH-${monthIndex}-${storeIndex}-0`,
          },
        },
      ];

      if ((monthIndex + storeIndex) % 3 === 0) {
        records.push({
          storeReference: { trtid: store.trtid },
          tchId: takeChargeId(monthIndex, storeIndex, 1),
          submittedBy: mockPersonAt(storeIndex + monthIndex + 4),
          submittedAt: submittedAt(
            month,
            (storeIndex % 10) + 16,
            recordNumber(monthIndex, storeIndex, 1),
          ),
          summary: "补充提交一项设备、流程或工作环境改进建议。",
          Status:
            TAKE_CHARGE_STATUSES[
              (monthIndex + storeIndex + 2) % TAKE_CHARGE_STATUSES.length
            ],
          sourceReference: {
            sourceSystem: "Mock Take Charge",
            sourceRecordId: `TCH-${monthIndex}-${storeIndex}-1`,
          },
        });
      }

      return records;
    }),
  );
}

export function createMockTakeChargeAnnualAggregateFixtures(
  months: readonly [Month, ...Month[]],
): readonly MockTakeChargeAnnualAggregateFixture[] {
  return createMockTakeChargeAnnualAggregateFixturesForStores(mockStores, months);
}

export function createMockTakeChargeAnnualAggregateFixturesForStores(
  stores: readonly { trtid: StoreId }[],
  months: readonly [Month, ...Month[]],
): readonly MockTakeChargeAnnualAggregateFixture[] {
  return months.flatMap((referenceMonth, monthIndex) => stores.map((store, storeIndex) => {
    const submissionsDenominatorPerMonth = 8 + (storeIndex % 4);
    const participationDenominatorPerMonth = 10 + (storeIndex % 3);
    const submissionsNumerator = Array.from({ length: monthIndex + 1 }, (_, monthOffset) =>
      30 + (storeIndex % 17) * 3 + ((storeIndex * 3 + monthOffset * 5) % 9) - 4,
    ).reduce((sum, count) => sum + count, 0);
    const participationNumerator = Array.from({ length: monthIndex + 1 }, (_, monthOffset) =>
      4 + (storeIndex % 5) + ((storeIndex + monthOffset * 2) % 3) - 1,
    ).reduce((sum, count) => sum + count, 0);
    return {
      storeId: store.trtid,
      year: Number(referenceMonth.slice(0, 4)),
      referenceMonth,
      // These are deterministic mock source aggregates, never derived from Take Charge records.
      submissionsNumerator,
      submissionsDenominator: submissionsDenominatorPerMonth * (monthIndex + 1),
      participationNumerator,
      participationDenominator: participationDenominatorPerMonth * (monthIndex + 1),
    };
  }));
}
