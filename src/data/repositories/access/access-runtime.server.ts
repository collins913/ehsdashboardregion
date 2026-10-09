import "server-only";
import type { StoreMasterData } from "@/types/ehs";
import type { AccessRepository } from "./access-repository";
import { getMockDataset } from "@/data/mock/mock-dataset";
import { resolveMockProfile } from "@/data/mock/mock-profile.server";
import { mockAccessRepository } from "./mock-access-repository.server";
import { resolveDataSourceMode } from "@/data/server/data-source-mode.server";

export interface AccessRuntime {
  stores: readonly StoreMasterData[];
  repository: AccessRepository;
}

export function createConfiguredProductionAccessRuntime(): AccessRuntime {
  throw new Error("PRODUCTION_ACCESS_ADAPTER_NOT_CONFIGURED");
}

export function getAccessRuntime(now = new Date()): AccessRuntime {
  if (resolveDataSourceMode() === "production") return createConfiguredProductionAccessRuntime();
  return { stores: getMockDataset(resolveMockProfile(), now).stores, repository: mockAccessRepository };
}
