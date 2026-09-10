import type { TrainingRecord } from "@/types/ehs";

export const mockTrainingRecords = [
  { storeReference: { trtid: "TEST-001" }, month: "2026-01", trainingName: "月度安全基础", isRequired: true, isFullyCompleted: true },
  { storeReference: { trtid: "TEST-001" }, month: "2026-01", trainingName: "PPE 使用", isRequired: true, isFullyCompleted: true },
  { storeReference: { trtid: "TEST-001" }, month: "2026-02", trainingName: "应急响应", isRequired: true, isFullyCompleted: true },
  { storeReference: { trtid: "TEST-001" }, month: "2026-03", trainingName: "危险沟通", isRequired: true, isFullyCompleted: true },
  { storeReference: { storeNameCn: "示例云桥店" }, month: "2026-01", trainingName: "月度安全基础", isRequired: true, isFullyCompleted: true },
  { storeReference: { storeNameCn: "示例云桥店" }, month: "2026-02", trainingName: "应急响应", isRequired: true, isFullyCompleted: false },
  { storeReference: { storeNameCn: "示例云桥店" }, month: "2026-03", trainingName: "危险沟通", isRequired: true, isFullyCompleted: true },
  { storeReference: { storeNameEn: "Sample Galaxy Store" }, month: "2026-01", trainingName: "月度安全基础", isRequired: true, isFullyCompleted: true },
  { storeReference: { storeNameEn: "Sample Galaxy Store" }, month: "2026-01", trainingName: "承包商安全", isRequired: true, isFullyCompleted: true },
  { storeReference: { storeNameEn: "Sample Galaxy Store" }, month: "2026-02", trainingName: "应急响应", isRequired: true, isFullyCompleted: true },
] satisfies readonly TrainingRecord[];
