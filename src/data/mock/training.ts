import { mockStores } from "@/data/mock/stores";
import type { Month, TrainingRecord } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockTrainingRecords(
  months: SupportedMonths,
): readonly TrainingRecord[] {
  return mockStores.flatMap((store, storeIndex) =>
    months.flatMap((month, monthIndex) => {
      if (
        storeIndex === mockStores.length - 1 &&
        monthIndex === months.length - 1
      ) {
        return [];
      }

      return [{
        storeReference: { trtid: store.trtid },
        month,
        trainingName: `月度必修培训 ${monthIndex + 1}`,
        isRequired: true,
        isFullyCompleted: !(
          storeIndex % 4 === 1 && monthIndex === months.length - 1
        ),
      } satisfies TrainingRecord];
    }),
  );
}
