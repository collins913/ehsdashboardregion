import "server-only";
import type { MonitoringRepository } from "@/data/repositories/monitoring/monitoring-repository";
import { MemoryMonitoringRepository } from "@/data/server/testing/memory-monitoring-repository";

let developmentRepository: MonitoringRepository | null = null;

/** Company deployments must install durable storage; the in-process adapter is never a production fallback. */
export function createConfiguredProductionMonitoringRepository(): MonitoringRepository {
  throw new Error("PRODUCTION_MONITORING_ADAPTER_NOT_CONFIGURED");
}

export function getMonitoringRepository(env: NodeJS.ProcessEnv = process.env): MonitoringRepository {
  if (env.NODE_ENV === "production") return createConfiguredProductionMonitoringRepository();
  if (env.EHS_MONITORING_MODE === "disabled") throw new Error("MONITORING_STORAGE_DISABLED");
  if (!developmentRepository) developmentRepository = new MemoryMonitoringRepository();
  return developmentRepository;
}

export function setDevelopmentMonitoringRepositoryForTests(repository: MonitoringRepository | null) {
  if (process.env.NODE_ENV === "production") throw new Error("TEST_MONITORING_ADAPTER_FORBIDDEN_IN_PRODUCTION");
  developmentRepository = repository;
}
