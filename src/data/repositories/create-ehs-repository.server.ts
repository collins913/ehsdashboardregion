import "server-only";

import type { EhsRepository } from "@/data/repositories/ehs-repository";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";

export function createEhsRepository(referenceDate: Date): EhsRepository {
  return createMockEhsRepository(referenceDate);
}
