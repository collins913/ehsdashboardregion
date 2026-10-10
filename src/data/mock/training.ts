import { mockStores } from "@/data/mock/stores";
import { MOCK_V1_REQUIRED_TRAINING_ITEMS } from "@/data/mock/overview-required-sets";
import type { Month, StoreMasterData, TrainingRecord } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockTrainingRecords(
  months: SupportedMonths,
): readonly TrainingRecord[] {
  return createMockTrainingRecordsForStores(mockStores, months);
}

export function createMockTrainingRecordsForStores(
  stores: readonly StoreMasterData[],
  months: SupportedMonths,
  scenarioFor = (storeIndex: number, monthIndex: number) => (storeIndex + monthIndex) % 7,
): readonly TrainingRecord[] {
  return stores.flatMap((store, storeIndex) =>
    months.flatMap((month, monthIndex) => {
      const scenario = scenarioFor(storeIndex, monthIndex);
      return MOCK_V1_REQUIRED_TRAINING_ITEMS.flatMap((trainingName, itemIndex) => {
        if (scenario === 2 && itemIndex === 1) return [];
        const completionRate = scenario === 1 && itemIndex === 1 ? 84
          : scenario === 3 && itemIndex === 1 ? Number.NaN
            : scenario === 4 && itemIndex === 1 ? null
              : 100;
        return [{
          storeReference: { trtid: store.trtid },
          month,
          trainingName,
          completionRate,
          incompletePeople: completionRate !== 100 ? ["Mock incomplete participant"] : [],
        } satisfies TrainingRecord];
      });
    }),
  );
}
