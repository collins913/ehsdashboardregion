import "server-only";
import type { EhsRepository } from "./ehs-repository";

export type ProductionRepositoryAdapter = Partial<EhsRepository>;

const requiredMethods: readonly (keyof EhsRepository)[] = [
  "getKpiData", "getKpiTrainingDetails", "getKpiDrillDetails", "getKpiInspectionDetails", "getKpiAstmDetails",
  "getOverviewScoreData", "getActions", "getActionsAnalytics", "getEvents", "getEventsAnalytics",
  "getTakeChargeGoals", "getTakeChargeRecords", "getStores", "getEnvironment", "getEnvironmentAnalytics",
  "getCertificates", "getFilterStores",
];

export function composeProductionEhsRepository(adapters: readonly ProductionRepositoryAdapter[]): EhsRepository {
  const composed: Partial<EhsRepository> = {};
  for (const adapter of adapters) for (const key of requiredMethods) {
    const method = adapter[key];
    if (typeof method !== "function") continue;
    if (composed[key]) throw new Error(`DUPLICATE_PRODUCTION_REPOSITORY_METHOD:${String(key)}`);
    (composed as Record<string, unknown>)[key] = method.bind(adapter);
  }
  const missing = requiredMethods.filter((key) => !composed[key]);
  if (missing.length) throw new Error(`INCOMPLETE_PRODUCTION_REPOSITORY:${missing.map(String).join(",")}`);
  return composed as EhsRepository;
}

/** Company-specific storage adapter replaces this seam; no database is assumed here. */
export function createConfiguredProductionEhsRepository(_referenceDate: Date): EhsRepository {
  throw new Error("PRODUCTION_REPOSITORY_ADAPTER_NOT_CONFIGURED");
}
