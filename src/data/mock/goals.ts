import type { GoalSummary } from "@/types/ehs";

export const mockGoalSummaries = [
  { storeReference: { trtid: "TEST-001" }, period: "2026-01", takeChargeSubmissionsPerCapita: 3.5, takeChargeCloseRate: 89, takeChargeParticipateRate: 49 },
  { storeReference: { trtid: "TEST-001" }, period: "2026-02", takeChargeSubmissionsPerCapita: 4, takeChargeCloseRate: 90, takeChargeParticipateRate: 50 },
  { storeReference: { trtid: "TEST-001" }, period: "2026-03", takeChargeSubmissionsPerCapita: 4.6, takeChargeCloseRate: 97.5, takeChargeParticipateRate: 62 },
  { storeReference: { trtid: "TEST-002" }, period: "2026-01", takeChargeSubmissionsPerCapita: 5.1, takeChargeCloseRate: 91, takeChargeParticipateRate: 48 },
  { storeReference: { trtid: "TEST-002" }, period: "2026-02", takeChargeSubmissionsPerCapita: 3.8, takeChargeCloseRate: 88, takeChargeParticipateRate: 50 },
  { storeReference: { trtid: "TEST-002" }, period: "2026-03", takeChargeSubmissionsPerCapita: 4, takeChargeCloseRate: 93, takeChargeParticipateRate: 55 },
] satisfies readonly GoalSummary[];
