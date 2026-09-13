import { mockStores } from "@/data/mock/stores";
import { mockPersonAt } from "@/data/mock/people";
import type { EventRecord, IsoDateTime, Month } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

const mockEventTypes = [
  "Injury/Illness",
  "Auto Event",
  "General Liability",
  "Environmental",
  "Agency Contact",
  "Near Miss",
] as const;

export function createMockEventRecords(
  months: SupportedMonths,
): readonly EventRecord[] {
  const currentQuarterStart = Math.floor((months.length - 1) / 3) * 3;
  const currentQuarterMonths = months.slice(currentQuarterStart);

  return currentQuarterMonths.flatMap((month, monthIndex) =>
    Array.from({ length: 6 }, (_, index): EventRecord => {
      const sequence = monthIndex * 6 + index;
      const store = mockStores[sequence % mockStores.length];
      const eventType = mockEventTypes[sequence % mockEventTypes.length];
      const Status = sequence % 5 === 4 ? "Closed" : "Open";
      const storeReference =
        sequence % 3 === 0
          ? { trtid: store.trtid }
          : sequence % 3 === 1
            ? { storeNameEn: store.storeNameEn }
            : { trtid: store.trtid, storeNameEn: store.storeNameEn };

      return {
        eventId: `EVT-${month.slice(2, 4)}${month.slice(5, 7)}${index + 1}`,
        storeReference,
        eventType,
        submittedBy: mockPersonAt(sequence + 3),
        eventDate:
          `${month}-${String(index + 2).padStart(2, "0")}T${String(9 + index).padStart(2, "0")}:30:00` as IsoDateTime,
        EventDetail: {
          Description:
            sequence === 0
              ? "后场设备防护装置在例行检查中发现异常，需要完整记录现场情况、影响范围及后续处置进展。"
              : eventType === "Agency Contact"
                ? "监管部门到店开展例行检查并记录现场情况。"
                : "门店报告事件并启动后续调查与处置。",
        },
        Status,
        ASTMInjuryIllness:
          sequence === 2 || sequence === 7 ? "Yes" : "No",
      };
    }),
  );
}
