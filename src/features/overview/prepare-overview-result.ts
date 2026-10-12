import type { EhsStoreScope, KpiStore } from "@/data/contracts/kpi";
import type { OverviewDimensionId, OverviewDimensionItemScore, OverviewDimensionScore, OverviewHistoryPoint, OverviewMetricId, OverviewQuery, OverviewResult, OverviewScopeComparison, OverviewScopeDetail, OverviewScopeLevel, ScoreContribution } from "@/data/contracts/overview";
import { includedMonthsBetween } from "@/data/contracts/kpi-period";
import { OVERVIEW_V1_METRIC_CATALOG } from "@/lib/rules/overview-scoring";
import type { Month, StoreId } from "@/types/ehs";

const DIMENSIONS: readonly OverviewDimensionId[] = ["PERFORMANCE", "TAKE_CHARGE", "CERTIFICATES", "ENVIRONMENT"];
const PERCENT = 100;

interface Points { earned: number; available: number }
function hasCompletePoints(points: Points, storeCount: number, metricCount = 1): boolean {
  const expected = storeCount * metricCount;
  return expected > 0 && points.available === expected;
}
function add(target: Points, contribution: ScoreContribution) {
  target.earned += contribution.earnedPoints;
  target.available += contribution.availablePoints;
}

function rate(points: Points): number | null {
  return points.available > 0 ? (points.earned / points.available) * PERCENT : null;
}

function difference(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
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

function dataDomain(values: readonly number[], minBound: number, maxBound: number, minimumPadding: number, paddingRatio: number, includeZero = false): readonly [number, number] {
  if (values.length === 0) return minBound === 0 && maxBound === 100 ? [0, 100] : [-1, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0 && (!includeZero || min === 0)) {
    const padding = Math.max(minimumPadding, Math.abs(min) * 0.01);
    return [Math.max(minBound, min - padding), Math.min(maxBound, max + padding)];
  }
  const low = includeZero ? Math.min(0, min) : min;
  const high = includeZero ? Math.max(0, max) : max;
  const padding = Math.max(minimumPadding, (high - low) * paddingRatio);
  return [Math.max(minBound, low - padding), Math.min(maxBound, high + padding)];
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
  referenceMonth: Month;
  stores: readonly KpiStore[];
  contributions: readonly ScoreContribution[];
  selectedStores: readonly KpiStore[];
  attentionStores: readonly KpiStore[];
  context: OverviewQuery["context"];
  requestedScope: EhsStoreScope;
  availableMonths: readonly Month[];
  sourceAvailability: OverviewResult["availability"];
}): OverviewResult {
  const { stores, selectedStores, attentionStores, requestedScope, availableMonths, sourceAvailability, referenceMonth } = input;
  const contributions = contributionIndex(input.contributions);
  const selectedMonths = [referenceMonth];
  const previousMonths = [monthOffset(referenceMonth, -1)];
  const availableMonthSet = new Set(availableMonths);
  const previousAvailable = previousMonths.every((month) => availableMonthSet.has(month));
  const allByStore = new Map(stores.map((store) => [store.storeId, store]));
  const currentPeriodLabel = referenceMonth;
  const previousPeriodLabel = previousAvailable ? periodLabel(previousMonths) : "无可比较历史";
  const historyMonths = (includedMonthsBetween(monthOffset(referenceMonth, -11), referenceMonth) ?? []).filter((month) => availableMonthSet.has(month));
  const monthlyHistory: OverviewHistoryPoint[] = historyMonths.map((month) => ({
    periodLabel: month,
    score: availableMonthSet.has(month) ? rate(aggregate(contributions, selectedStores, [month])) : null,
  }));
  const lastMonth = referenceMonth;
  const priorMonth = lastMonth ? monthOffset(lastMonth, -1) : null;
  const monthlyDelta = lastMonth && priorMonth && availableMonthSet.has(lastMonth) && availableMonthSet.has(priorMonth)
    ? difference(rate(aggregate(contributions, selectedStores, [lastMonth])), rate(aggregate(contributions, selectedStores, [priorMonth])))
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
      delta: availableMonthSet.has(referenceMonth) && previousAvailable && hasCompletePoints(points, selectedStores.length) && hasCompletePoints(previousPoints, selectedStores.length)
        ? difference(points.earned / selectedStores.length, previousPoints.earned / selectedStores.length) : null,
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
      delta: availableMonthSet.has(referenceMonth) && previousAvailable && hasCompletePoints(points, selectedStores.length, metrics.length) && hasCompletePoints(old, selectedStores.length, metrics.length)
        ? difference(points.earned / selectedStores.length, old.earned / selectedStores.length) : null,
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
      pointDelta: previousAvailable && points.available > 0 && previousPoints.available > 0 ? points.earned - previousPoints.earned : null,
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
  for (const store of new Map([...selectedStores, ...attentionStores].map((store) => [store.storeId, store])).values()) {
    const currentPoints = aggregate(contributions, [store], selectedMonths);
    const historical = historyMonths.map((month) => ({ periodLabel: month, score: availableMonthSet.has(month) ? rate(aggregate(contributions, [store], [month])) : null }));
    const previousOne = lastMonth ? monthOffset(lastMonth, -1) : null;
    const delta = lastMonth && previousOne && availableMonthSet.has(lastMonth) && availableMonthSet.has(previousOne)
      ? difference(rate(aggregate(contributions, [store], [lastMonth])), rate(aggregate(contributions, [store], [previousOne])))
      : null;
    const storeDimensions = DIMENSIONS.map((dimensionId) => {
      const points = aggregate(contributions, [store], selectedMonths, dimensionId);
      const previousPoints = previousAvailable ? aggregate(contributions, [store], previousMonths, dimensionId) : { earned: 0, available: 0 };
      const dimensionItems = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId).map((metric) => {
        const itemPoints = aggregate(contributions, [store], selectedMonths, dimensionId, metric.metricId);
        const previousItemPoints = previousAvailable ? aggregate(contributions, [store], previousMonths, dimensionId, metric.metricId) : { earned: 0, available: 0 };
        return { id: metric.metricId, earnedPoints: itemPoints.available ? itemPoints.earned : null, totalPoints: itemPoints.available, averageEarnedPoints: itemPoints.available ? itemPoints.earned : null, averageTotalPoints: itemPoints.available ? itemPoints.available : null, delta: availableMonthSet.has(referenceMonth) && previousAvailable && hasCompletePoints(itemPoints, 1) && hasCompletePoints(previousItemPoints, 1) ? difference(itemPoints.earned, previousItemPoints.earned) : null };
      });
      const metricCount = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId).length;
      return { dimensionId, id: dimensionId, earnedPoints: points.available ? points.earned : null, totalPoints: points.available, averageEarnedPoints: points.available ? points.earned : null, averageTotalPoints: points.available ? points.available : null, delta: availableMonthSet.has(referenceMonth) && previousAvailable && hasCompletePoints(points, 1, metricCount) && hasCompletePoints(previousPoints, 1, metricCount) ? difference(points.earned, previousPoints.earned) : null, items: dimensionItems };
    });
    scopeDetails.push({ id: store.storeId, label: store.displayName, level: "STORE", storeCount: 1, score: rate(currentPoints), monthlyDelta: delta, monthlyHistory: historical, dimensionScores: storeDimensions });
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
  const detailGroups = new Map<string, { id: string; label: string; level: OverviewScopeLevel; members: readonly KpiStore[] }>(areas.map(([key, members]) => [key.replace("\u0000", ":"), {
    id: key.replace("\u0000", ":"), label: members[0]?.area ?? key, level: "AREA" as OverviewScopeLevel, members,
  }]));
  for (const group of matrixGroups) if (group.level !== "STORE") detailGroups.set(group.id, group);
  for (const { id, label, level, members } of detailGroups.values()) {
    const currentPoints = aggregate(contributions, members, selectedMonths);
    const areaDimensions = DIMENSIONS.map((dimensionId) => {
      const points = aggregate(contributions, members, selectedMonths, dimensionId);
      const old = previousAvailable ? aggregate(contributions, members, previousMonths, dimensionId) : { earned: 0, available: 0 };
      const dimensionItems = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId).map((metric) => {
        const itemPoints = aggregate(contributions, members, selectedMonths, dimensionId, metric.metricId);
        const oldItem = previousAvailable ? aggregate(contributions, members, previousMonths, dimensionId, metric.metricId) : { earned: 0, available: 0 };
        return { id: metric.metricId, earnedPoints: itemPoints.available ? itemPoints.earned : null, totalPoints: itemPoints.available, averageEarnedPoints: members.length && itemPoints.available ? itemPoints.earned / members.length : null, averageTotalPoints: members.length && itemPoints.available ? itemPoints.available / members.length : null, delta: availableMonthSet.has(referenceMonth) && previousAvailable && hasCompletePoints(itemPoints, members.length) && hasCompletePoints(oldItem, members.length) ? difference(itemPoints.earned / members.length, oldItem.earned / members.length) : null };
      });
      const metricCount = OVERVIEW_V1_METRIC_CATALOG.filter((metric) => metric.dimensionId === dimensionId).length;
      return { dimensionId, id: dimensionId, earnedPoints: points.available ? points.earned : null, totalPoints: points.available, averageEarnedPoints: members.length && points.available ? points.earned / members.length : null, averageTotalPoints: members.length && points.available ? points.available / members.length : null, delta: availableMonthSet.has(referenceMonth) && previousAvailable && hasCompletePoints(points, members.length, metricCount) && hasCompletePoints(old, members.length, metricCount) ? difference(points.earned / members.length, old.earned / members.length) : null, items: dimensionItems };
    });
    const history = historyMonths.map((month) => ({ periodLabel: month, score: availableMonthSet.has(month) ? rate(aggregate(contributions, members, [month])) : null }));
    const prior = lastMonth ? monthOffset(lastMonth, -1) : null;
    const delta = lastMonth && prior && availableMonthSet.has(lastMonth) && availableMonthSet.has(prior) ? difference(rate(aggregate(contributions, members, [lastMonth])), rate(aggregate(contributions, members, [prior]))) : null;
    scopeDetails.push({ id, label, level, storeCount: members.length, score: rate(currentPoints), monthlyDelta: delta, monthlyHistory: history, dimensionScores: areaDimensions });
  }

  // Each matrix member is an actual plotted object, not that object's underlying stores.
  const coordinates = new Map<string, { id: string; score: number; delta: number; level: OverviewScopeLevel; count: number; members: { id: string; label: string }[] }>();
  for (const group of matrixGroups) {
    const now = aggregate(contributions, group.members, selectedMonths);
    const old = previousAvailable ? aggregate(contributions, group.members, previousMonths) : { earned: 0, available: 0 };
    const score = rate(now);
    const delta = difference(score, previousAvailable ? rate(old) : null);
    if (score === null || delta === null) continue;
    const key = `${group.level}\u0000${score}\u0000${delta}`;
    const point = coordinates.get(key) ?? { id: group.id, score, delta, level: group.level, count: 0, members: [] };
    point.members.push({ id: group.id, label: group.label });
    point.count = point.members.length;
    coordinates.set(key, point);
  }
  const attentionGroups = [...coordinates.values()];
  const scores = attentionGroups.map(({ score }) => score);
  const deltas = attentionGroups.map(({ delta }) => delta);
  const averageScore = scores.length ? attentionGroups.reduce((sum, group) => sum + group.score * group.count, 0) / attentionGroups.reduce((sum, group) => sum + group.count, 0) : null;
  const xDomain: readonly [number, number] = dataDomain(scores, 0, 100, 1, 0.12);
  const yDomain: readonly [number, number] = dataDomain(deltas, -Infinity, Infinity, 0.2, 0.12, true);
  const storeRankings = ranking(selectedStores, contributions, selectedMonths, previousMonths, previousAvailable, "store", allByStore);
  const areaRankings = ranking(selectedStores, contributions, selectedMonths, previousMonths, previousAvailable, "area", allByStore);
  const detailLevel = comparisons;
  const detailScoreDimensions = dimensionScores;
  const scopeLabel = requestedScope.store.kind === "INCLUDE" ? `已选 ${selectedStores.length} 家门店` : requestedScope.area.kind === "INCLUDE" ? selectedStores[0]?.area ?? "所选小区" : requestedScope.region.kind === "INCLUDE" ? requestedScope.region.values[0] : "全部区域";

  return {
    availability: sourceAvailability,
    stores: selectedStores,
    storeCount: selectedStores.length,
    scopeLabel,
    currentPeriodLabel,
    previousPeriodLabel,
    periodNotice: "",
    scoreRuleVersion: "V1",
    hero: {
      scoreMonth: referenceMonth,
      overallScore: availableMonthSet.has(referenceMonth) ? rate(aggregate(contributions, selectedStores, [referenceMonth])) : null,
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
