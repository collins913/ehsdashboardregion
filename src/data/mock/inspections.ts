import { mockStores } from "@/data/mock/stores";
import { mockPersonAt } from "@/data/mock/people";
import { MOCK_V1_EXPECTED_INSPECTION_TASKS } from "@/data/mock/overview-required-sets";
import type { InspectionRecord, Month, StoreMasterData } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockInspectionRecords(
  months: SupportedMonths,
): readonly InspectionRecord[] {
  return createMockInspectionRecordsForStores(mockStores, months);
}

export function createMockInspectionRecordsForStores(
  stores: readonly StoreMasterData[],
  months: SupportedMonths,
): readonly InspectionRecord[] {
  let sequence = 0;

  return stores.flatMap((store, storeIndex) =>
    months.flatMap((month, monthIndex) => {
      const scenario = (storeIndex + monthIndex) % 7;
      return MOCK_V1_EXPECTED_INSPECTION_TASKS.flatMap((inspectionName, taskIndex) => {
        if (scenario === 2 && taskIndex === 1) return [];
        sequence += 1;
        const status = scenario === 1 && taskIndex === 1 ? "未完成"
          : scenario === 3 && taskIndex === 1 ? 42 as unknown as string
            : scenario === 4 && taskIndex === 1 ? null
              : "已完成";
        return [{
          inspectionNumber: `INP-${String(sequence).padStart(5, "0")}`,
          storeReference: { trtid: store.trtid },
          inspectionName,
          dueDate: `${month}-20`,
          inspector: mockPersonAt(storeIndex + monthIndex),
          status,
        } satisfies InspectionRecord];
      });
    }),
  );
}
