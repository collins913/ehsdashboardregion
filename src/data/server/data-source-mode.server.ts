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
}
