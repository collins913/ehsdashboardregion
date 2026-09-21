import type { OverviewDemoScopeComparison } from "./overview-demo-types";
import type { OverviewDemoHistoryPoint } from "./overview-demo-types";

export function scoreDelta(
  current: number | null,
  previous: number | null,
): number | null {
  return current === null || previous === null ? null : current - previous;
}

export function classifyOverviewDemoTrend(
  history: readonly OverviewDemoHistoryPoint[],
): "持续改善" | "持续下降" | "近期回升" | "基本稳定" {
  const scores = history.flatMap((point) => (point.score === null ? [] : [point.score]))
  if (scores.length < 2) return "基本稳定"
  const changes = scores.slice(1).map((score, index) => score - scores[index])
  if (changes.every((change) => change > 0)) return "持续改善"
  if (changes.every((change) => change < 0)) return "持续下降"
  if (changes.at(-1)! > 0 && changes.slice(0, -1).some((change) => change <= 0)) return "近期回升"
  return "基本稳定"
}

export function rankScopeComparisons(
  comparisons: readonly OverviewDemoScopeComparison[],
): readonly OverviewDemoScopeComparison[] {
  return [...comparisons].sort((left, right) => {
    if (left.score === null) return 1;
    if (right.score === null) return -1;
    return right.score - left.score || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  });
}

export function trendExtremes(comparisons: readonly OverviewDemoScopeComparison[]) {
  const withDelta = comparisons.filter(
    (item): item is OverviewDemoScopeComparison & { delta: number } => item.delta !== null,
  );
  const ascending = [...withDelta].sort(
    (left, right) => left.delta - right.delta || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  );
  const descending = [...ascending].reverse();

  return {
    improvements: descending.filter((item) => item.delta > 0),
    declines: ascending.filter((item) => item.delta < 0),
    largestImprovement: descending.find((item) => item.delta > 0) ?? null,
    largestDecline: ascending.find((item) => item.delta < 0) ?? null,
  };
}

export function buildOverviewDemoSparkline(
  history: readonly OverviewDemoHistoryPoint[],
  width = 280,
  height = 72,
): string {
  const scores = history.flatMap((point) => (point.score === null ? [] : [point.score]));
  if (scores.length === 0) return "";
  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);
  const range = Math.max(1, maximum - minimum);

  return history
    .map((point, index) => {
      const x = history.length === 1 ? width / 2 : (index / (history.length - 1)) * width;
      const y = point.score === null ? height : height - ((point.score - minimum) / range) * (height - 12) - 6;
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(" ");
}
