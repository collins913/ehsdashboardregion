import { mockStores } from "@/data/mock/stores";
import type { InspectionRecord, Month } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockInspectionRecords(
  months: SupportedMonths,
): readonly InspectionRecord[] {
  return mockStores.flatMap((store, storeIndex) =>
    months.flatMap((period, monthIndex) =>
      storeIndex === 1 && monthIndex === months.length - 1
        ? []
        : [{
            storeReference: { trtid: store.trtid },
            period,
            isRequired: true,
            isCompleted: !(
              storeIndex === 5 && monthIndex === months.length - 1
            ),
          } satisfies InspectionRecord],
    ),
  );
}
