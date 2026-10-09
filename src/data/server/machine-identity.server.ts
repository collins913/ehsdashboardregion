import "server-only";
import type { MachineIdentityProvider } from "@/data/contracts/server-identity";
import { PRODUCTION_DOMAINS } from "@/data/contracts/production-import";

export function createConfiguredMachineIdentityProvider(): MachineIdentityProvider {
  throw new Error("MACHINE_IDENTITY_PROVIDER_NOT_CONFIGURED");
}

export async function authenticateMachineRequest(request: Request) {
  const principal = await createConfiguredMachineIdentityProvider().authenticate(request);
  if (!principal || typeof principal.principalId !== "string" || !principal.principalId.trim() ||
      !Array.isArray(principal.allowedDomains) || principal.allowedDomains.some((domain) => !PRODUCTION_DOMAINS.includes(domain)) ||
      !Array.isArray(principal.allowedOperations) || principal.allowedOperations.some((operation) => !["SUBMIT", "READ", "VALIDATE", "PUBLISH"].includes(operation))) return null;
  return principal;
}
