import { QueryError } from "@/data/contracts/query-result";
import "server-only";
import type { ProductionAccessPrincipal } from "@/data/contracts/production-import";
import type { ServerIdentityProvider } from "@/data/contracts/server-identity";
import { assertMockIdentityAllowed } from "./data-source-mode.server";
import { getCurrentIdentity } from "@/data/repositories/access/mock-identity.server";

export type IdentityMode = "mock" | "enterprise";

export function resolveIdentityMode(env: NodeJS.ProcessEnv = process.env): IdentityMode {
  const mode = env.EHS_IDENTITY_MODE?.trim().toLowerCase();
  if (mode === "mock") { assertMockIdentityAllowed(env); return "mock"; }
  if (mode === "enterprise") return "enterprise";
  if (mode) throw new Error("INVALID_EHS_IDENTITY_MODE");
  return env.NODE_ENV === "production" || env.EHS_DATA_SOURCE?.trim().toLowerCase() === "production" ? "enterprise" : "mock";
}

/** Enterprise SSO adapter is supplied by the deployment integration. Never trusts request JSON. */
export function createConfiguredServerIdentityProvider(): ServerIdentityProvider {
  throw new Error("SERVER_IDENTITY_PROVIDER_NOT_CONFIGURED");
}

export async function getVerifiedServerPrincipal(): Promise<ProductionAccessPrincipal | null> {
  if (resolveIdentityMode() === "mock") {
    const identity = getCurrentIdentity();
    return { principalId: `mock:${identity.email}`, verifiedEmail: identity.email, displayName: null, attributes: { source: "mock" } };
  }
  return createConfiguredServerIdentityProvider().getVerifiedPrincipal();
}

export async function requireVerifiedServerPrincipal(): Promise<ProductionAccessPrincipal> {
  const principal = await getVerifiedServerPrincipal();
  if (!principal) throw new QueryError("AUTHENTICATION_REQUIRED");
  if (!principal.principalId.trim()) throw new Error("INVALID_TRUSTED_PRINCIPAL");
  return principal;
}
