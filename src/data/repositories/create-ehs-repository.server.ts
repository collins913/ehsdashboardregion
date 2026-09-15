import "server-only";

import { getMockDataset } from "@/data/mock/mock-dataset";
import { resolveMockProfile } from "@/data/mock/mock-profile.server";
import type { EhsRepository } from "@/data/repositories/ehs-repository";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";

export function createEhsRepository(referenceDate: Date): EhsRepository {
  const profile = resolveMockProfile();
  const dataset = getMockDataset(profile, referenceDate);

  return createMockEhsRepository(referenceDate, { dataset });
}
