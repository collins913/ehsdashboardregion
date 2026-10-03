import type { OverviewRequiredSetProvider } from "@/data/contracts/overview-requirements";

// Synthetic V1 names exercise the domain rules; they are not a production catalog.
export const MOCK_V1_REQUIRED_TRAINING_ITEMS = [
  "Mock 必修培训 A",
  "Mock 必修培训 B",
] as const;

export const MOCK_V1_EXPECTED_INSPECTION_TASKS = [
  "Mock 月度检查 A",
  "Mock 月度检查 B",
] as const;

export const mockV1OverviewRequiredSetProvider: OverviewRequiredSetProvider = {
  getRequiredTrainingItems: () => MOCK_V1_REQUIRED_TRAINING_ITEMS,
  getExpectedInspectionTasks: () => MOCK_V1_EXPECTED_INSPECTION_TASKS,
};
