export type FirstAdminBootstrapResult = "INITIALIZED" | "ALREADY_INITIALIZED" | "PRINCIPAL_NOT_ALLOWED" | "VERIFIED_EMAIL_REQUIRED";

/** Persistence must atomically create the first admin grant and its audit/bootstrap record. */
export interface FirstAdminBootstrapStore {
  initializeFirstAdmin(input: { principalId: string; verifiedEmail: string; initializedAt: string }): Promise<FirstAdminBootstrapResult>;
}

export async function bootstrapFirstAdmin(
  principal: { principalId: string; verifiedEmail: string | null },
  configuredPrincipalId: string | undefined,
  store: FirstAdminBootstrapStore,
  initializedAt: string,
): Promise<FirstAdminBootstrapResult> {
  if (!configuredPrincipalId || principal.principalId !== configuredPrincipalId) return "PRINCIPAL_NOT_ALLOWED";
  if (!principal.verifiedEmail) return "VERIFIED_EMAIL_REQUIRED";
  return store.initializeFirstAdmin({ principalId: principal.principalId, verifiedEmail: principal.verifiedEmail, initializedAt });
}
