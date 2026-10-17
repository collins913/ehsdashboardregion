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
  const byStatus = new Map<string, { sourceStatus: NormalizedActionRecord["sourceStatus"]; count: number }>();

  for (const record of records) {
    const key = JSON.stringify([record.sourceStatus.kind, record.sourceStatus.value]);
    const statusBucket = byStatus.get(key);
    if (statusBucket) statusBucket.count += 1;
    else byStatus.set(key, { sourceStatus: record.sourceStatus, count: 1 });
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
    byStatus: [...byStatus.values()].sort((left, right) => {
      const rank = (status: NormalizedActionRecord["sourceStatus"]) =>
        status.kind !== "KNOWN" ? 0 : status.value === "Closed" ? 2 : status.value === "Cancelled" ? 1 : 0;
      return rank(left.sourceStatus) - rank(right.sourceStatus);
    }),
    closure: {
      closedOrCancelledCount,
      otherCount,
      closureRate:
        records.length === 0 ? null : (closedOrCancelledCount / records.length) * 100,
    },
    monthly: [...monthly.values()].sort((left, right) => left.month.localeCompare(right.month)),
  };
}
