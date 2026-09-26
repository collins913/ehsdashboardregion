import type { ActionAnalyticsResult } from "@/data/contracts/action-analytics";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { NormalizedActionRecord } from "@/data/contracts/action-record";
import { shanghaiMonthForInstant } from "@/data/contracts/kpi-period";

export function buildActionAnalytics(
  context: EhsFilterContext,
  records: readonly NormalizedActionRecord[],
): Omit<ActionAnalyticsResult, "availability"> {
  const monthly = new Map(
    context.period.includedMonths.map((month) => [month, { month, actionCount: 0 }]),
  );
  let closedOrCancelledCount = 0;

  for (const record of records) {
    const month = shanghaiMonthForInstant(record.submittedDate);
    const bucket = month === null ? undefined : monthly.get(month);
    if (bucket !== undefined) bucket.actionCount += 1;

    if (
      record.sourceStatus.kind === "KNOWN" &&
      (record.sourceStatus.value === "Closed" || record.sourceStatus.value === "Cancelled")
    ) {
      closedOrCancelledCount += 1;
    }
  }

  const otherCount = records.length - closedOrCancelledCount;
  return {
    closure: {
      closedOrCancelledCount,
      otherCount,
      closureRate:
        records.length === 0 ? null : (closedOrCancelledCount / records.length) * 100,
    },
    monthly: [...monthly.values()].sort((left, right) => left.month.localeCompare(right.month)),
  };
}
