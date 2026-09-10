import type { EventRecord } from "@/types/ehs";

export const mockEventRecords = [
  { eventId: "EVT-001", storeReference: { trtid: "TEST-001" }, eventDateTime: "2026-01-08T09:30:00+08:00", eventType: "Agency", titleSummary: "测试政府例行检查", Status: "Closed", ASTMInjuryIllness: "No", sourceReference: { sourceSystem: "Mock Event", sourceRecordId: "EVT-001" } },
  { eventId: "EVT-002", storeReference: { trtid: "TEST-002" }, eventDateTime: "2026-01-18T15:20:00+08:00", eventType: "Non-Agency Event", titleSummary: "测试轻微割伤事件", Status: "UnderReview", ASTMInjuryIllness: "No", severity: "Minor" },
  { eventId: "EVT-003", storeReference: { storeNameCn: "示例星河店" }, eventDateTime: "2026-02-04T11:10:00+08:00", eventType: "Non-Agency Event", titleSummary: "测试记录性伤害事件", Status: "Investigating", ASTMInjuryIllness: "Yes", severity: "Recordable", sourceReference: { sourceSystem: "Mock Event", sourceRecordId: "EVT-003" } },
  { eventId: "EVT-004", storeReference: { trtid: "TEST-004" }, eventDateTime: "2026-02-14T10:00:00+08:00", eventType: "Agency", titleSummary: "测试专项政府检查", Status: "Open", ASTMInjuryIllness: "NotApplicable", sourceReference: null },
  { eventId: "EVT-005", storeReference: { storeNameEn: "Sample Bay Store" }, eventDateTime: "2026-02-28T23:55:00+08:00", eventType: "Non-Agency Event", titleSummary: "测试月末险情记录", Status: "Closed", ASTMInjuryIllness: "No", severity: "Near Miss" },
  { eventId: "EVT-006", storeReference: { trtid: "TEST-006" }, eventDateTime: "2026-03-01T00:05:00+08:00", eventType: "Non-Agency Event", titleSummary: "测试月初跌倒事件", Status: "Pending", ASTMInjuryIllness: "No", severity: "Moderate" },
  { eventId: "EVT-007", storeReference: { trtid: "TEST-007" }, eventDateTime: "2026-03-12T14:40:00+08:00", eventType: "Agency", titleSummary: "测试联合检查", Status: "Closed", ASTMInjuryIllness: "No" },
  { eventId: "EVT-008", storeReference: { trtid: "TEST-008" }, eventDateTime: "2026-03-21T16:15:00+08:00", eventType: "Non-Agency Event", titleSummary: "测试设备碰撞事件", Status: "CorrectiveAction", ASTMInjuryIllness: "Yes", severity: "High", sourceReference: { sourceSystem: "Mock Event", sourceRecordId: "EVT-008" } },
] satisfies readonly EventRecord[];
