import "server-only";

import { parseMockProfile, type MockProfile } from "@/data/mock/mock-profile";

export function resolveMockProfile(): MockProfile {
  return parseMockProfile(process.env.EHS_MOCK_PROFILE);
}
