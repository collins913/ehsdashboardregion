import type {
  NormalizedTakeChargeRecord,
  TakeChargeMonthlyAggregate,
} from "@/data/contracts/take-charge";
import { shanghaiMonthForInstant } from "@/data/contracts/kpi-period";
import { isTakeChargeClosedForRate } from "@/lib/rules/take-charge-rules";

export function buildTakeChargeMonthlyAggregates(
  records: readonly NormalizedTakeChargeRecord[],
): readonly TakeChargeMonthlyAggregate[] {
  const aggregates = new Map<string, TakeChargeMonthlyAggregate>();

  for (const record of records) {
    const month = shanghaiMonthForInstant(record.submittedAt);

    if (month === null) {
      continue;
    }

    const key = `${record.storeId}:${month}`;
    const current = aggregates.get(key) ?? {
      storeId: record.storeId,
      month,
      totalCount: 0,
      closedCount: 0,
    };

    aggregates.set(key, {
      ...current,
      totalCount: current.totalCount + 1,
      closedCount:
        current.closedCount +
        (isTakeChargeClosedForRate(record.sourceStatus) ? 1 : 0),
    });
  }

  return [...aggregates.values()];
}
