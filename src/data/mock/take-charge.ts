import type { TakeChargeFieldDefinition } from "@/data/contracts/take-charge";
import { mockStores } from "@/data/mock/stores";
import { mockPersonAt } from "@/data/mock/people";
import type { Month, StoreId, TakeChargeRecord } from "@/types/ehs";

// Mock-only source fixture. Its inputs must not become a production aggregate contract.
export interface MockTakeChargeAnnualAggregateFixture {
  storeId: StoreId;
  year: number;
  submissionsNumerator: number;
  submissionsDenominator: number;
  participationNumerator: number;
  participationDenominator: number;
}

export interface MockTakeChargeAnnualAggregate {
  averageSubmissionsYtd: number;
  participationRateYtd: number;
}

export function createMockTakeChargeAnnualAggregateReader(
  fixtures: readonly MockTakeChargeAnnualAggregateFixture[],
) {
  return (
    year: number,
    selectedStoreIds: readonly StoreId[],
  ): MockTakeChargeAnnualAggregate | null => {
    const selectedStoreIdSet = new Set(selectedStoreIds);
    const selected = fixtures.filter(
      (fixture) =>
        fixture.year === year && selectedStoreIdSet.has(fixture.storeId),
    );
    const covered =
      selectedStoreIds.length > 0 &&
      selectedStoreIds.every((storeId) =>
        selected.some((fixture) => fixture.storeId === storeId),
      );
    const submissionsNumerator = selected.reduce(
      (sum, fixture) => sum + fixture.submissionsNumerator,
      0,
    );
    const submissionsDenominator = selected.reduce(
      (sum, fixture) => sum + fixture.submissionsDenominator,
      0,
    );
    const participationNumerator = selected.reduce(
      (sum, fixture) => sum + fixture.participationNumerator,
      0,
    );
    const participationDenominator = selected.reduce(
      (sum, fixture) => sum + fixture.participationDenominator,
      0,
    );

    if (
      !covered ||
      submissionsDenominator <= 0 ||
      participationDenominator <= 0
    ) {
      return null;
    }

    return {
      averageSubmissionsYtd:
        submissionsNumerator / submissionsDenominator,
      participationRateYtd:
        (participationNumerator / participationDenominator) * 100,
    };
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
  year: number,
): readonly MockTakeChargeAnnualAggregateFixture[] {
  return mockStores.map((store, index) => ({
    storeId: store.trtid,
    year,
    submissionsNumerator: 32 + (index % 6) * 7,
    submissionsDenominator: 8 + (index % 3),
    participationNumerator: 5 + (index % 5),
    participationDenominator: 10 + (index % 4),
  }));
}
