import { mockStores } from "@/data/mock/stores";
import type { EventRecord, Month } from "@/types/ehs";

type SupportedMonths = readonly [Month, ...Month[]];

export function createMockEventRecords(
  months: SupportedMonths,
): readonly EventRecord[] {
  const currentMonth = months[months.length - 1];
  const previousMonth = months[Math.max(0, months.length - 2)];

  return [
    {
      eventId: `EVT-${currentMonth}-003`,
      storeReference: { trtid: mockStores[2].trtid },
      eventDateTime: `${currentMonth}-04T11:10:00+08:00`,
      eventType: "Non-Agency Event",
      titleSummary: "测试记录性伤害事件",
      Status: "Investigating",
      ASTMInjuryIllness: "Yes",
      severity: "Recordable",
    },
    {
      eventId: `EVT-${previousMonth}-008`,
      storeReference: { trtid: mockStores[7].trtid },
      eventDateTime: `${previousMonth}-21T16:15:00+08:00`,
      eventType: "Non-Agency Event",
      titleSummary: "测试设备碰撞事件",
      Status: "CorrectiveAction",
      ASTMInjuryIllness: "Yes",
      severity: "High",
    },
  ] satisfies readonly EventRecord[];
}
