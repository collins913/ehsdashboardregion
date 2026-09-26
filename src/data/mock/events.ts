import { mockStores } from "@/data/mock/stores";
import { mockPersonAt } from "@/data/mock/people";
import type { EventRecord, IsoDateTime, Month } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

const eventsPerMonth = [4, 5, 4, 6, 5, 7, 6, 8, 7, 6, 8, 7] as const;

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
  return months.flatMap((month, monthIndex) => {
    const monthlyRecords = Array.from(
      { length: eventsPerMonth[monthIndex] ?? 7 },
      (_, index): EventRecord => {
        // Keep Store, Event Type, and ASTM source facts stable as monthly
        // Analytics fixtures are added or adjusted.
        const sequence = monthIndex * 6 + index;
        const quarterSequence = (monthIndex % 3) * 6 + index;
        const store = mockStores[sequence % mockStores.length];
        const eventType = mockEventTypes[sequence % mockEventTypes.length];
        const Status = quarterSequence % 5 === 4 ? "Closed" : "Open";
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
            (monthIndex === 6 && index === 2) ||
            (monthIndex === 7 && index === 1)
              ? "Yes"
              : "No",
        };
      },
    );
    return monthlyRecords;
  });
}
