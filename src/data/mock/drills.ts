import type { DrillRecord } from "@/types/ehs";

export const mockDrillRecords = [
  { storeReference: { trtid: "TEST-001" }, month: "2026-01", drillName: "火灾疏散演练", isCompleted: true },
  { storeReference: { trtid: "TEST-001" }, month: "2026-02", drillName: "化学品泄漏演练", isCompleted: true },
  { storeReference: { trtid: "TEST-001" }, month: "2026-03", drillName: "急救演练", isCompleted: true },
  { storeReference: { trtid: "TEST-002" }, month: "2026-01", drillName: "火灾疏散演练", isCompleted: true },
  { storeReference: { trtid: "TEST-002" }, month: "2026-03", drillName: "急救演练", isCompleted: true },
  { storeReference: { trtid: "TEST-003" }, month: "2026-01", drillName: "火灾疏散演练", isCompleted: true },
  { storeReference: { trtid: "TEST-003" }, month: "2026-01", drillName: "停电响应演练", isCompleted: true },
  { storeReference: { trtid: "TEST-003" }, month: "2026-02", drillName: "化学品泄漏演练", isCompleted: true },
  { storeReference: { trtid: "TEST-003" }, month: "2026-03", drillName: "急救演练", isCompleted: true },
] satisfies readonly DrillRecord[];
