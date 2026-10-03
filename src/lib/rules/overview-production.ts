import type { EhsFilterContext, EhsStoreScope, KpiStore } from "@/data/contracts/kpi";
import type { KpiDomainResult } from "@/data/contracts/domain-result";
import type { TakeChargeMetricValue } from "@/data/contracts/take-charge";
import type { CertificatesStoreRow } from "@/data/contracts/certificates";
import type { OverviewScoreData, OverviewMetricId } from "@/data/contracts/overview";
import type { Month, StoreId } from "@/types/ehs";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { buildOverviewScoreContributions, overviewObservationKey, type OverviewDomainObservation } from "./overview-scoring";

export interface StoreGoalDomainResult {
  storeId: StoreId;
  closeRate: TakeChargeMetricValue;
  averageSubmissionsYtd: TakeChargeMetricValue;
  participationRateYtd: TakeChargeMetricValue;
}
export interface OverviewDomainReaders {
  performance(context: EhsFilterContext): Promise<readonly KpiDomainResult[]>;
  goals(context: EhsFilterContext, referenceDate: string): Promise<readonly StoreGoalDomainResult[]>;
  certificates(scope: EhsStoreScope, referenceDate: string): Promise<readonly CertificatesStoreRow[]>;
}
const certificateMetrics = {
  "安全健康": "CERTIFICATE_SAFETY_HEALTH", "急救员": "CERTIFICATE_FIRST_AID",
  "特种作业": "CERTIFICATE_SPECIAL_WORK", "安全驾驶": "CERTIFICATE_SAFE_DRIVING",
} as const;

/** Orchestration and result-to-points mapping only; no raw sources or domain evaluation. */
export async function produceOverviewScoreData(
  stores: readonly KpiStore[], attentionStores: readonly KpiStore[], months: readonly Month[],
  referenceDateForMonth: (month: Month) => string, readers: OverviewDomainReaders,
): Promise<OverviewScoreData> {
  const calculationStores = [...new Map([...stores, ...attentionStores].map((store) => [store.storeId, store])).values()];
  if (calculationStores.length === 0) return { stores, attentionStores, months, contributions: [], availability: "UNAVAILABLE" };
  const scope: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" },
    store: { kind: "INCLUDE", values: calculationStores.map((store) => store.storeId) as [StoreId, ...StoreId[]] } };
  const referenceDates = new Map(months.map((month) => [month, referenceDateForMonth(month)]));
  const observations = new Map<string, OverviewDomainObservation>();
  for (const month of months) {
    const period = periodFromMonthRange(month, month);
    if (!period) throw new Error("Invalid Overview source month.");
    const context = { ...scope, period };
    const referenceDate = referenceDates.get(month)!;
    const [performance, goals, certificates] = await Promise.all([
      readers.performance(context), readers.goals(context, referenceDate), readers.certificates(scope, referenceDate),
    ]);
    const put = (storeId: StoreId, metricId: OverviewMetricId, observation: OverviewDomainObservation) =>
      observations.set(overviewObservationKey(storeId, month, metricId), observation);
    for (const row of performance) {
      for (const [metricId, value] of [["TRAINING", row.training], ["DRILL", row.drill],
        ["ACTION_CLOSURE_RATE", row.actions], ["INSPECTION", row.inspections]] as const) {
        put(row.store.storeId, metricId, { kind: "DOMAIN_ACHIEVEMENT", result: value.result, reason: value.reason });
      }
      put(row.store.storeId, "ASTM_INCIDENT", { kind: "ASTM_RESULT", result: row.astmEvents.result, unavailableReason: row.astmEvents.reason });
    }
    for (const row of goals) for (const [metricId, value] of [["TAKE_CHARGE_CLOSE_RATE", row.closeRate],
      ["AVERAGE_SUBMISSIONS_YTD", row.averageSubmissionsYtd], ["PARTICIPATION_RATE_YTD", row.participationRateYtd]] as const) {
      put(row.storeId, metricId, { kind: "DOMAIN_ACHIEVEMENT", result: value.result, reason: value.reason });
    }
    for (const row of certificates) for (const category of row.categories) {
      put(row.storeId, certificateMetrics[category.certificateCategory], {
        kind: "CERTIFICATE_RESULT", normal: category.status === "NORMAL", reason: category.reason,
      });
    }
  }
  return { stores, attentionStores, months, availability: stores.length ? "AVAILABLE" : "UNAVAILABLE",
    contributions: buildOverviewScoreContributions(calculationStores, months, (month) => referenceDates.get(month)!, observations) };
}
