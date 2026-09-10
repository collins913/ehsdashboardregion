import type {
  TakeChargeParticipationRecord,
  TakeChargeRecord,
} from "@/types/ehs";

export const mockTakeChargeRecords = [
  { storeReference: { trtid: "TEST-001" }, submitter: "测试员工甲", submittedDate: "2026-01-09", summary: "测试关闭并有行动项", Status: "ClosedWithAction", sourceReference: { sourceSystem: "Mock Take Charge", sourceRecordId: "TC-001" } },
  { storeReference: { trtid: "TEST-001" }, submitter: "测试员工乙", submittedDate: "2026-01-17", summary: "测试关闭且无行动项", Status: "ClosedWithoutAction" },
  { storeReference: { trtid: "TEST-002" }, submitter: "测试员工丙", submittedDate: "2026-02-05", summary: "测试已拒绝记录", Status: "Declined", sourceReference: null },
  { storeReference: { trtid: "TEST-002" }, submitter: "测试员工丁", submittedDate: "2026-02-19", summary: "测试待审核记录", Status: "PendingReview" },
  { storeReference: { trtid: "TEST-003" }, submitter: "测试员工戊", submittedDate: "2026-03-02", summary: "测试处理中记录", Status: "InProgress", sourceReference: { sourceSystem: "Mock Take Charge", sourceRecordId: "TC-005" } },
  { storeReference: { trtid: "TEST-003" }, submitter: "测试员工己", submittedDate: "2026-03-18", summary: "测试新提交记录", Status: "Submitted" },
] satisfies readonly TakeChargeRecord[];

export const mockTakeChargeParticipationRecords = [
  { storeReference: { trtid: "TEST-001" }, personName: "测试员工甲", hasSubmitted: true },
  { storeReference: { trtid: "TEST-001" }, personName: "测试员工乙", hasSubmitted: false },
  { storeReference: { trtid: "TEST-001" }, personName: "测试员工丙", hasSubmitted: true },
  { storeReference: { trtid: "TEST-002" }, personName: "测试员工丁", hasSubmitted: false },
  { storeReference: { trtid: "TEST-002" }, personName: "测试员工戊", hasSubmitted: true },
  { storeReference: { trtid: "TEST-002" }, personName: "测试员工己", hasSubmitted: false },
] satisfies readonly TakeChargeParticipationRecord[];
