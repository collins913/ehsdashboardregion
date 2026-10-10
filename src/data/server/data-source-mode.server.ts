import "server-only";

export type DataSourceMode = "mock" | "production";

export function resolveDataSourceMode(env: NodeJS.ProcessEnv = process.env): DataSourceMode {
  const configured = env.EHS_DATA_SOURCE?.trim().toLowerCase();
  if (configured === "mock" || configured === "production") return configured;
  if (configured) throw new Error("INVALID_EHS_DATA_SOURCE");
  if (env.NODE_ENV === "production") throw new Error("EHS_DATA_SOURCE_REQUIRED");
  return "mock";
}

export function assertMockIdentityAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") throw new Error("MOCK_IDENTITY_FORBIDDEN_IN_PRODUCTION");
  if (env.EHS_DATA_SOURCE?.trim().toLowerCase() === "production") throw new Error("MOCK_IDENTITY_FORBIDDEN_WITH_PRODUCTION_DATA");
}

/**
 * Production business dates come from the server clock. The request value remains
 * injectable only for Mock mode so deterministic fixtures and tests can select a date.
 */
export function resolveBusinessReferenceDate(
  requestedReferenceDateIso: string,
  env: NodeJS.ProcessEnv = process.env,
  now: () => Date = () => new Date(),
): Date {
  const referenceDate = resolveDataSourceMode(env) === "production"
    ? now()
    : new Date(requestedReferenceDateIso);

  if (!Number.isFinite(referenceDate.valueOf())) {
    throw new Error("INVALID_BUSINESS_REFERENCE_DATE");
  }

  return referenceDate;
}
