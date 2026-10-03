import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi";
import type { OverviewDimensionId, OverviewDimensionItemScore, OverviewDimensionScore, OverviewHistoryPoint, OverviewMetricId, OverviewQuery, OverviewResult, OverviewScopeComparison, OverviewScopeDetail, OverviewScopeLevel, ScoreContribution } from "@/data/contracts/overview";
import { includedMonthsBetween } from "@/data/contracts/kpi-period";
import { OVERVIEW_V1_METRIC_CATALOG } from "@/lib/rules/overview-scoring";
import type { Month, StoreId } from "@/types/ehs";

const DIMENSIONS: readonly OverviewDimensionId[] = ["PERFORMANCE", "TAKE_CHARGE", "CERTIFICATES", "ENVIRONMENT"];
const PERCENT = 100;

interface Points { earned: number; available: number }
function add(target: Points, contribution: ScoreContribution) {
  target.earned += contribution.earnedPoints;
  target.available += contribution.availablePoints;
}

function rate(points: Points): number | null {
  return points.available > 0 ? (points.earned / points.available) * PERCENT : null;
}

function monthOffset(month: Month, offset: number): Month {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + monthNumber - 1 + offset;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}` as Month;
}

function periodLabel(months: readonly Month[]): string {
  if (months.length === 0) return "无可用月份";
  const first = months[0];
  const last = months[months.length - 1];
  return first === last ? first : `${first} 至 ${last}`;
}

function compareId(a: string, b: string) { return a < b ? -1 : a > b ? 1 : 0; }

type ContributionIndex = ReadonlyMap<string, readonly ScoreContribution[]>;

function contributionIndex(contributions: readonly ScoreContribution[]): ContributionIndex {
  const index = new Map<string, ScoreContribution[]>();
  for (const contribution of contributions) {
    const key = `${contribution.storeId}\u0000${contribution.month}`;
    const rows = index.get(key) ?? [];
    rows.push(contribution);
    index.set(key, rows);
  }
  return index;
}

function aggregate(
  contributions: ContributionIndex,
  stores: readonly KpiStore[],
  months: readonly Month[],
  dimension?: OverviewDimensionId,
  metricId?: OverviewMetricId,
): Points {
  const points = { earned: 0, available: 0 };
  for (const store of stores) {
    for (const month of months) {
      for (const contribution of contributions.get(`${store.storeId}\u0000${month}`) ?? []) {
        if (dimension && contribution.dimensionId !== dimension) continue;
        if (metricId && contribution.metricId !== metricId) continue;
        add(points, contribution);
      }
    }
  }
  return points;
}

function previousMonthsFor(months: readonly Month[]): readonly Month[] {
  if (months.length === 0) return [];
  const count = months.length;
  const firstPrevious = monthOffset(months[0], -count);
  return includedMonthsBetween(firstPrevious, monthOffset(months[0], -1)) ?? [];
}

function rankRows(rows: readonly OverviewScopeComparison[]): readonly OverviewScopeComparison[] {
  const sorted = [...rows].sort((left, right) =>
    (right.score ?? -1) - (left.score ?? -1) || compareId(left.id, right.id),
  );
  return sorted.map((row, index) => ({ ...row, rank: index + 1, rankLabel: `${index + 1}` }));
}

function ranking(
  stores: readonly KpiStore[],
  contributions: ContributionIndex,
  currentMonths: readonly Month[],
  previousMonths: readonly Month[],
  previousAvailable: boolean,
  groupKey: "area" | "store",
  storesById: ReadonlyMap<StoreId, KpiStore>,
): { improving: readonly { scopeId: string; label: string; score: number | null; delta: number | null }[]; declining: readonly { scopeId: string; label: string; score: number | null; delta: number | null }[] } {
  const groups = new Map<string, KpiStore[]>();
  for (const store of stores) {
    const key = groupKey === "store" ? store.storeId : `${store.region}\u0000${store.area}`;
    groups.set(key, [...(groups.get(key) ?? []), store]);
  }
  const candidates = [...groups].map(([key, members]) => {
    const current = aggregate(contributions, members, currentMonths);
    const previous = previousAvailable ? aggregate(contributions, members, previousMonths) : { earned: 0, available: 0 };
    const score = rate(current);
    const previousScore = previousAvailable ? rate(previous) : null;
    return {
      scopeId: groupKey === "store" ? key : key.replace("\u0000", ":"),
      label: groupKey === "store" ? storesById.get(key as StoreId)?.displayName ?? key : members[0]?.area ?? key,
      score,
      delta: score === null || previousScore === null ? null : score - previousScore,
    };
  }).filter((row) => row.delta !== null);
  const changeOrder = (a: typeof candidates[number], b: typeof candidates[number]) => (a.delta ?? 0) - (b.delta ?? 0) || compareId(a.scopeId, b.scopeId);
  const improving = candidates.filter((row) => (row.delta ?? -1) >= 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0) || compareId(a.scopeId, b.scopeId)).slice(0, 3);
  const improvingIds = new Set(improving.map((row) => row.scopeId));
  const declining = candidates.filter((row) => (row.delta ?? 1) <= 0 && !improvingIds.has(row.scopeId)).sort(changeOrder).slice(0, 3);
  return { improving, declining };
}

export function prepareOverviewResult(input: {
  stores: readonly KpiStore[];
  contributions: readonly ScoreContribution[];
  selectedStores: readonly KpiStore[];
  attentionStores: readonly KpiStore[];
  context: OverviewQuery["context"];
  requestedScope: EhsStoreScope;
  availableMonths: readonly Month[];
  sourceAvailability: OverviewResult["availability"];
}): OverviewResult {
  const { stores, selectedStores, attentionStores, context, requestedScope, availableMonths, sourceAvailability } = input;
  const contributions = contributionIndex(input.contributions);
  const selectedMonths = context.period.includedMonths;
  const previousMonths = previousMonthsFor(selectedMonths);
  const availableMonthSet = new Set(availableMonths);
  const previousAvailable = previousMonths.length > 0 && previousMonths.every((month) => availableMonthSet.has(month));
  const visibleMonths = selectedMonths.filter((month) => availableMonthSet.has(month));
  const allByStore = new Map(stores.map((store) => [store.storeId, store]));
  const current = aggregate(contributions, selectedStores, selectedMonths);
  const previous = previousAvailable ? aggregate(contributions, selectedStores, previousMonths) : { earned: 0, available: 0 };
  const currentRate = rate(current);
  const previousRate = previousAvailable ? rate(previous) : null;
  const currentPeriodLabel = periodLabel(selectedMonths);
  const previousPeriodLabel = previousAvailable ? periodLabel(previousMonths) : "无可比较历史";
  const monthlyHistory: OverviewHistoryPoint[] = visibleMonths.map((month) => ({
    periodLabel: month,
    score: rate(aggregate(contributions, selectedStores, [month])),
  }));
  const lastMonth = visibleMonths.at(-1);
  const priorMonth = lastMonth ? monthOffset(lastMonth, -1) : null;
  const monthlyDelta = lastMonth && priorMonth && availableMonthSet.has(priorMonth)
    ? (rate(aggregate(contributions, selectedStores, [lastMonth])) ?? 0) - (rate(aggregate(contributions, selectedStores, [priorMonth])) ?? 0)
    : null;

  const items: OverviewDimensionItemScore[] = OVERVIEW_V1_METRIC_CATALOG.map((metric) => {
    const dimensionId = metric.dimensionId;
    const points = aggregate(contributions, selectedStores, selectedMonths, dimensionId, metric.metricId);
    const previousPoints = previousAvailable ? aggregate(contributions, selectedStores, previousMonths, dimensionId, metric.metricId) : { earned: 0, available: 0 };
    const perStore = selectedStores.length > 0;
    const score: OverviewDimensionItemScore = {
      id: metric.metricId,
      earnedPoints: points.available > 0 ? points.earned : null,
      totalPoints: points.available,
      averageEarnedPoints: perStore && points.available > 0 ? points.earned / selectedStores.length : null,
      averageTotalPoints: perStore && points.available > 0 ? points.available / selectedStores.length : null,
      delta: previousAvailable && rate(points) !== null && rate(previousPoints) !== null ? rate(points)! - rate(previousPoints)! : null,
    };
    return score;
  });

  const dimensionScores: OverviewDimensionScore[] = DIMENSIONS.map((dimensionId) => {
    const metrics = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId);
    const points = aggregate(contributions, selectedStores, selectedMonths, dimensionId);
    const old = previousAvailable ? aggregate(contributions, selectedStores, previousMonths, dimensionId) : { earned: 0, available: 0 };
    const selected = items;
    return {
      dimensionId,
      id: dimensionId,
      earnedPoints: points.available > 0 ? points.earned : null,
      totalPoints: points.available,
      averageEarnedPoints: selectedStores.length && points.available ? points.earned / selectedStores.length : null,
      averageTotalPoints: selectedStores.length && points.available ? points.available / selectedStores.length : null,
      delta: previousAvailable && rate(points) !== null && rate(old) !== null ? rate(points)! - rate(old)! : null,
      items: metrics.map((metric) => selected.find((item) => item.id === metric.metricId)!),
    };
  });

  const comparisons = rankRows(selectedStores.map((store) => {
    const points = aggregate(contributions, [store], selectedMonths);
    const previousPoints = previousAvailable ? aggregate(contributions, [store], previousMonths) : { earned: 0, available: 0 };
    const score = rate(points);
    const previousScore = previousAvailable ? rate(previousPoints) : null;
    return {
      id: store.storeId,
      rank: null,
      label: store.displayName,
      level: "STORE" as const,
      score,
      previousScore,
      delta: score === null || previousScore === null ? null : score - previousScore,
      earnedPoints: points.available > 0 ? points.earned : null,
      totalPoints: points.available,
      pointDelta: previousAvailable ? points.earned - previousPoints.earned : null,
      storeCount: 1,
    };
  }));

  const areaGroups = new Map<string, KpiStore[]>();
  for (const store of selectedStores) {
    const key = `${store.region}\u0000${store.area}`;
    const members = areaGroups.get(key) ?? [];
    members.push(store);
    areaGroups.set(key, members);
  }
  const areas = [...areaGroups.entries()];
  const scopeDetails: OverviewScopeDetail[] = [];
  for (const store of attentionStores) {
    const currentPoints = aggregate(contributions, [store], selectedMonths);
    const historical = visibleMonths.map((month) => ({ periodLabel: month, score: rate(aggregate(contributions, [store], [month])) }));
    const previousOne = lastMonth ? monthOffset(lastMonth, -1) : null;
    const delta = lastMonth && previousOne && availableMonthSet.has(previousOne)
      ? (rate(aggregate(contributions, [store], [lastMonth])) ?? 0) - (rate(aggregate(contributions, [store], [previousOne])) ?? 0)
      : null;
    const storeDimensions = DIMENSIONS.map((dimensionId) => {
      const points = aggregate(contributions, [store], selectedMonths, dimensionId);
      const previousPoints = previousAvailable ? aggregate(contributions, [store], previousMonths, dimensionId) : { earned: 0, available: 0 };
      const dimensionItems = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId).map((metric) => {
        const itemPoints = aggregate(contributions, [store], selectedMonths, dimensionId, metric.metricId);
        const previousItemPoints = previousAvailable ? aggregate(contributions, [store], previousMonths, dimensionId, metric.metricId) : { earned: 0, available: 0 };
        return { id: metric.metricId, earnedPoints: itemPoints.available ? itemPoints.earned : null, totalPoints: itemPoints.available, averageEarnedPoints: itemPoints.available ? itemPoints.earned : null, averageTotalPoints: itemPoints.available ? itemPoints.available : null, delta: previousAvailable ? (rate(itemPoints) ?? 0) - (rate(previousItemPoints) ?? 0) : null };
      });
      return { dimensionId, id: dimensionId, earnedPoints: points.available ? points.earned : null, totalPoints: points.available, averageEarnedPoints: points.available ? points.earned : null, averageTotalPoints: points.available ? points.available : null, delta: previousAvailable ? (rate(points) ?? 0) - (rate(previousPoints) ?? 0) : null, items: dimensionItems };
    });
    scopeDetails.push({ id: store.storeId, label: store.displayName, level: "STORE", storeCount: 1, score: rate(currentPoints), monthlyDelta: delta, monthlyHistory: historical, dimensionScores: storeDimensions });
  }
  for (const [key, members] of areas) {
    const currentPoints = aggregate(contributions, members, selectedMonths);
    const previousPoints = previousAvailable ? aggregate(contributions, members, previousMonths) : { earned: 0, available: 0 };
    const id = key.replace("\u0000", ":");
    const label = members[0]?.area ?? key;
    const areaDimensions = DIMENSIONS.map((dimensionId) => {
      const points = aggregate(contributions, members, selectedMonths, dimensionId);
      const old = previousAvailable ? aggregate(contributions, members, previousMonths, dimensionId) : { earned: 0, available: 0 };
      const dimensionItems = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId).map((metric) => {
        const itemPoints = aggregate(contributions, members, selectedMonths, dimensionId, metric.metricId);
        const oldItem = previousAvailable ? aggregate(contributions, members, previousMonths, dimensionId, metric.metricId) : { earned: 0, available: 0 };
        return { id: metric.metricId, earnedPoints: itemPoints.available ? itemPoints.earned : null, totalPoints: itemPoints.available, averageEarnedPoints: members.length && itemPoints.available ? itemPoints.earned / members.length : null, averageTotalPoints: members.length && itemPoints.available ? itemPoints.available / members.length : null, delta: previousAvailable ? (rate(itemPoints) ?? 0) - (rate(oldItem) ?? 0) : null };
      });
      return { dimensionId, id: dimensionId, earnedPoints: points.available ? points.earned : null, totalPoints: points.available, averageEarnedPoints: members.length && points.available ? points.earned / members.length : null, averageTotalPoints: members.length && points.available ? points.available / members.length : null, delta: previousAvailable ? (rate(points) ?? 0) - (rate(old) ?? 0) : null, items: dimensionItems };
    });
    const history = visibleMonths.map((month) => ({ periodLabel: month, score: rate(aggregate(contributions, members, [month])) }));
    const prior = lastMonth ? monthOffset(lastMonth, -1) : null;
    const delta = lastMonth && prior && availableMonthSet.has(prior) ? (rate(aggregate(contributions, members, [lastMonth])) ?? 0) - (rate(aggregate(contributions, members, [prior])) ?? 0) : null;
    scopeDetails.push({ id, label, level: "AREA", storeCount: members.length, score: rate(currentPoints), monthlyDelta: delta, monthlyHistory: history, dimensionScores: areaDimensions });
  }

  let matrixGroups: { id: string; label: string; level: OverviewScopeLevel; members: readonly KpiStore[] }[];
  if (requestedScope.store.kind === "INCLUDE" && requestedScope.store.values.length > 1) {
    matrixGroups = selectedStores.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", members: [store] }));
  } else if (requestedScope.store.kind === "INCLUDE" || requestedScope.area.kind === "INCLUDE") {
    matrixGroups = attentionStores.map((store) => ({ id: store.storeId, label: store.displayName, level: "STORE", members: [store] }));
  } else {
    const groupedAreas = new Map<string, KpiStore[]>();
    for (const store of attentionStores) {
      const key = `${store.region}\u0000${store.area}`;
      const members = groupedAreas.get(key) ?? [];
      members.push(store);
      groupedAreas.set(key, members);
    }
    const groupLevel: OverviewScopeLevel = requestedScope.region.kind === "INCLUDE" || new Set(attentionStores.map((store) => store.region)).size === 1 ? "AREA" : "REGION";
    const groupedScopes = new Map<string, KpiStore[]>();
    for (const members of groupedAreas.values()) {
      const first = members[0];
      const key = groupLevel === "REGION" ? first.region : `${first.region}\u0000${first.area}`;
      const rows = groupedScopes.get(key) ?? [];
      rows.push(...members);
      groupedScopes.set(key, rows);
    }
    matrixGroups = [...groupedScopes].map(([key, members]) => ({
      id: groupLevel === "REGION" ? key : key.replace("\u0000", ":"),
      label: groupLevel === "REGION" ? members[0].region : members[0].area,
      level: groupLevel,
      members,
    }));
  }
  const attentionGroups = matrixGroups.flatMap((group) => {
    const now = aggregate(contributions, group.members, selectedMonths);
    const old = previousAvailable ? aggregate(contributions, group.members, previousMonths) : { earned: 0, available: 0 };
    const score = rate(now);
    const previousScore = previousAvailable ? rate(old) : null;
    if (score === null || previousScore === null) return [];
    return [{ id: group.id, score, delta: score - previousScore, level: group.level, count: group.members.length, members: group.members.map((member) => ({ id: member.storeId, label: member.displayName })) }];
  });
  const scores = attentionGroups.map(({ score }) => score);
  const deltas = attentionGroups.map(({ delta }) => delta);
  const averageScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  const xDomain: readonly [number, number] = scores.length ? [Math.max(0, Math.floor(Math.min(...scores) - 8)), Math.min(100, Math.ceil(Math.max(...scores) + 8))] : [0, 100];
  const deltaMin = deltas.length ? Math.min(0, ...deltas) : -2;
  const deltaMax = deltas.length ? Math.max(0, ...deltas) : 2;
  const yPadding = Math.max(2, Math.ceil((deltaMax - deltaMin) * .1));
  const yDomain: readonly [number, number] = [Math.floor(deltaMin - yPadding), Math.ceil(deltaMax + yPadding)];
  const storeRankings = ranking(selectedStores, contributions, selectedMonths, previousMonths, previousAvailable, "store", allByStore);
  const areaRankings = ranking(selectedStores, contributions, selectedMonths, previousMonths, previousAvailable, "area", allByStore);
  const detailLevel = comparisons;
  const detailScoreDimensions = dimensionScores;
  const scopeLabel = requestedScope.store.kind === "INCLUDE" ? `已选 ${selectedStores.length} 家门店` : requestedScope.area.kind === "INCLUDE" ? requestedScope.area.values[0] : requestedScope.region.kind === "INCLUDE" ? requestedScope.region.values[0] : "全部区域";

  return {
    availability: sourceAvailability,
    stores: selectedStores,
    storeCount: selectedStores.length,
    scopeLabel,
    currentPeriodLabel,
    previousPeriodLabel,
    periodNotice: visibleMonths.length === selectedMonths.length ? `分析周期：${periodLabel(visibleMonths)}` : `Global Period 包含尚无 source history 的月份；当前数据仅覆盖 ${periodLabel(availableMonths)}。未生成不存在的历史结果。`,
    scoreRuleVersion: "V1",
    hero: {
      overallScore: currentRate,
      monthlyDelta,
      monthlyScoreHistory: monthlyHistory,
      improvingRanking: { areas: areaRankings.improving, stores: storeRankings.improving },
      decliningRanking: { areas: areaRankings.declining, stores: storeRankings.declining },
    },
    attentionMatrix: { groups: attentionGroups, xDomain, yDomain, averageScore },
    dimensionScores: detailScoreDimensions,
    comparisons: detailLevel,
    scopeDetails,
  };
}
