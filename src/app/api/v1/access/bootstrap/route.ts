import { queryErrorCode } from "@/data/contracts/query-result";
import { requireVerifiedServerPrincipal } from "@/data/server/identity-provider.server";
import { createConfiguredFirstAdminBootstrapStore } from "@/data/server/first-admin-bootstrap-runtime.server";
import { bootstrapFirstAdmin } from "@/data/repositories/access/first-admin-bootstrap";

export const runtime = "nodejs";
export async function POST() {
  try {
    const principal = await requireVerifiedServerPrincipal();
    const configuredPrincipalId = process.env.EHS_BOOTSTRAP_PRINCIPAL_ID;
    if (!configuredPrincipalId || principal.principalId !== configuredPrincipalId || !principal.verifiedEmail) {
      const result = !principal.verifiedEmail ? "VERIFIED_EMAIL_REQUIRED" : "PRINCIPAL_NOT_ALLOWED";
      return Response.json({ result }, { status: 403 });
    }
    const result = await bootstrapFirstAdmin(principal, configuredPrincipalId, createConfiguredFirstAdminBootstrapStore(), new Date().toISOString());
    const status = result === "INITIALIZED" ? 201 : result === "ALREADY_INITIALIZED" ? 409 : 403;
    return Response.json({ result }, { status });
  } catch (error) {
    const unauthenticated = queryErrorCode(error) === "AUTHENTICATION_REQUIRED";
    if (unauthenticated) return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
    return Response.json({ error: { code: "BOOTSTRAP_NOT_CONFIGURED", message: "管理员初始化依赖未配置。" } }, { status: 503 });
  }
}
