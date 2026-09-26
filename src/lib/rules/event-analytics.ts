import type { EventAnalyticsResult } from "@/data/contracts/event-analytics";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import { shanghaiMonthForInstant } from "@/data/contracts/kpi-period";
import type { Month } from "@/types/ehs";

function monthForEvent(dateTime: string): Month | null {
  return shanghaiMonthForInstant(dateTime);
}

function rate(closedCount: number, openCount: number): number | null {
  const denominator = closedCount + openCount;
  return denominator === 0 ? null : (closedCount / denominator) * 100;
}

export function buildEventAnalytics(
  context: EhsFilterContext,
  records: readonly NormalizedEventRecord[],
): Omit<EventAnalyticsResult, "availability"> {
  const types = new Map<string, number>();
  const monthly = new Map(
    context.period.includedMonths.map((month) => [
      month,
      { month, eventCount: 0, closedCount: 0, openCount: 0 },
    ]),
  );
  const monthlyByType = new Map<string, Map<Month, number>>();
  let closedCount = 0;
  let openCount = 0;

  for (const record of records) {
    types.set(record.eventType, (types.get(record.eventType) ?? 0) + 1);
    let typeMonthly = monthlyByType.get(record.eventType);
    if (typeMonthly === undefined) {
      typeMonthly = new Map(
        context.period.includedMonths.map((includedMonth) => [includedMonth, 0]),
      );
      monthlyByType.set(record.eventType, typeMonthly);
    }

    const month = monthForEvent(record.eventDate);
    if (month === null) continue;

    const bucket = monthly.get(month);
    if (bucket === undefined) continue;

    bucket.eventCount += 1;
    typeMonthly.set(month, (typeMonthly.get(month) ?? 0) + 1);
    if (record.recordState === "CLOSED") {
      closedCount += 1;
      bucket.closedCount += 1;
    } else if (record.recordState === "OPEN") {
      openCount += 1;
      bucket.openCount += 1;
    }
  }

  const byType = [...types]
    .map(([eventType, count]) => ({ eventType, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.eventType.localeCompare(right.eventType),
    );
  const overallTrend = [...monthly.values()].map(({ month, eventCount }) => ({
    month,
    eventCount,
  }));

  return {
    totalCount: records.length,
    byType,
    closure: { closedCount, openCount, closureRate: rate(closedCount, openCount) },
    monthly: [...monthly.values()].map(({ month, eventCount, closedCount: closed, openCount: open }) => ({
      month,
      eventCount,
      closureRate: rate(closed, open),
    })),
    trendSeries: [
      {
        key: "ALL",
        eventType: null,
        label: "全部",
        monthly: overallTrend,
      },
      ...byType.map(({ eventType }) => ({
        key: `EVENT_TYPE:${eventType}` as const,
        eventType,
        label: eventType,
        monthly: context.period.includedMonths.map((includedMonth) => ({
          month: includedMonth,
          eventCount: monthlyByType.get(eventType)?.get(includedMonth) ?? 0,
        })),
      })),
    ],
  };
}
