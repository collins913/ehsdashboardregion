import { mockStores } from "@/data/mock/stores";
import { mockPersonAt } from "@/data/mock/people";
import type { InspectionRecord, Month } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockInspectionRecords(
  months: SupportedMonths,
): readonly InspectionRecord[] {
  return mockStores.flatMap((store, storeIndex) =>
    months.flatMap((month, monthIndex) =>
      storeIndex === 1 && monthIndex === months.length - 1
        ? []
        : [{
            storeReference: { trtid: store.trtid },
            month,
            inspectionName: `月度安全检查 ${monthIndex + 1}`,
            dueDate: `${month}-20`,
            inspector: mockPersonAt(storeIndex + monthIndex),
            isRequired: true,
            status:
              storeIndex === 5 && monthIndex === months.length - 1
                ? "未完成"
                : "已完成",
          } satisfies InspectionRecord],
    ),
  );
}
