import type { AchievementResult, DomainReason } from "@/data/contracts/domain-result";
import type { DataAvailability, KpiInspectionRecord, KpiTrainingRecord } from "@/data/contracts/kpi";
import { mostSpecificReason } from "./domain-diagnostics";
import { sourceStatusCompletion } from "./performance-rules";

function recordResult(reasons: readonly DomainReason[], availability: DataAvailability): AchievementResult {
  const sourceReason = availability === "UNAVAILABLE" ? "SOURCE_MISSING"
    : availability === "INCOMPLETE" ? "SOURCE_INCOMPLETE" : undefined;
  const reason = mostSpecificReason([...reasons, sourceReason]);
  return { result: reason === "ACHIEVED" ? "ACHIEVED" : reason === "RULE_NOT_MET" ? "NOT_ACHIEVED" : "UNDETERMINED", reason };
}

/** Evaluate supplied records only. A covered empty scope has no pending work. */
export function evaluateTrainingRecords(records: readonly KpiTrainingRecord[], availability: DataAvailability, diagnostics?: string[]): AchievementResult {
  const reasons = records.map((record): DomainReason => {
    const label = `${record.month}：${record.trainingName}`;
    const rate = record.completionRate;
    if (rate === null) {
      diagnostics?.push(`${label}：完成率字段为空`);
      return "SOURCE_INCOMPLETE";
    }
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      diagnostics?.push(`${label}：完成率格式错误，须为 0–100 的有效数字`);
      return "SOURCE_INVALID";
    }
    return rate === 100 ? "ACHIEVED" : "RULE_NOT_MET";
  });
  return recordResult(reasons, availability);
}

export function evaluateInspectionRecords(records: readonly KpiInspectionRecord[], availability: DataAvailability, diagnostics?: string[]): AchievementResult {
  const reasons = records.map((record): DomainReason => {
    const label = `${record.month}：${record.inspectionName}（${record.inspectionNumber}）`;
    if (record.sourceStatusInvalid) {
      diagnostics?.push(`${label}：状态格式错误，须为文本`);
      return "SOURCE_INVALID";
    }
    const complete = sourceStatusCompletion(record.status);
    if (complete === null) {
      diagnostics?.push(`${label}：状态字段为空`);
      return "SOURCE_INCOMPLETE";
    }
    return complete ? "ACHIEVED" : "RULE_NOT_MET";
  });
  return recordResult(reasons, availability);
}
