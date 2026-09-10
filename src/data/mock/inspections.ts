import type { InspectionRecord } from "@/types/ehs";

export const mockInspectionRecords = [
  { storeReference: { trtid: "TEST-001" }, period: "2026-01", isRequired: true, isCompleted: true },
  { storeReference: { trtid: "TEST-001" }, period: "2026-02", isRequired: true, isCompleted: true },
  { storeReference: { trtid: "TEST-001" }, period: "2026-03", isRequired: true, isCompleted: true },
  { storeReference: { trtid: "TEST-002" }, period: "2026-01", isRequired: true, isCompleted: true },
  { storeReference: { trtid: "TEST-002" }, period: "2026-02", isRequired: true, isCompleted: false },
  { storeReference: { trtid: "TEST-002" }, period: "2026-03", isRequired: true, isCompleted: true },
] satisfies readonly InspectionRecord[];
