import { mockStores } from "@/data/mock/stores";
import type { DrillRecord, Month } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockDrillRecords(
  months: SupportedMonths,
): readonly DrillRecord[] {
  return mockStores.flatMap((store, storeIndex) =>
    months.flatMap((month, monthIndex) =>
      storeIndex === 1 && monthIndex === months.length - 1
        ? []
        : [{
            storeReference: { trtid: store.trtid },
            month,
            drillName: `月度应急演练 ${monthIndex + 1}`,
            status:
              storeIndex === 5 && monthIndex === months.length - 1
                ? "未完成"
                : "已完成",
          } satisfies DrillRecord],
    ),
  );
}
