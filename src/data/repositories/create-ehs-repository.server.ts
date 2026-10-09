import "server-only";

import { getMockDataset } from "@/data/mock/mock-dataset";
import { resolveMockProfile } from "@/data/mock/mock-profile.server";
import type { EhsRepository } from "@/data/repositories/ehs-repository";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { resolveDataSourceMode } from "@/data/server/data-source-mode.server";
import { createConfiguredProductionEhsRepository } from "@/data/repositories/production-ehs-repository.server";

export function createEhsRepository(referenceDate: Date): EhsRepository {
  if (resolveDataSourceMode() === "production") {
    return createConfiguredProductionEhsRepository(referenceDate);
  }
  const profile = resolveMockProfile();
  const dataset = getMockDataset(profile, referenceDate);

  return createMockEhsRepository(referenceDate, { dataset });
}
