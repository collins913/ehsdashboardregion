import { queryErrorCode } from "@/data/contracts/query-result";
import { requireVerifiedServerPrincipal } from "@/data/server/identity-provider.server";
import { createConfiguredFirstAdminBootstrapStore } from "@/data/server/first-admin-bootstrap-runtime.server";
import { bootstrapFirstAdmin } from "@/data/repositories/access/first-admin-bootstrap";
import { recordOperationalEvent } from "@/data/server/monitoring/monitoring-service.server";
import { randomUUID } from "node:crypto";

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
    await recordOperationalEvent({
      environment: process.env.NODE_ENV ?? "unknown", source: "Enterprise Access", component: "First Admin Bootstrap",
      severity: unauthenticated ? "INFO" : "ERROR", errorCode: unauthenticated ? "AUTHENTICATION_REQUIRED" : "ADMIN_BOOTSTRAP_FAILED",
      safeMessage: unauthenticated ? "管理员初始化请求未通过身份验证。" : "管理员初始化依赖未能完成请求。",
      phenomenon: "首次管理员初始化没有完成。", causeStatus: unauthenticated ? "KNOWN" : "UNKNOWN",
      knownCause: unauthenticated ? "服务端未取得可信登录身份。" : null,
      impact: { kind: "SYSTEM", id: "access-bootstrap", summary: "首次管理员初始化可能不可用。" },
      actionTaken: "未将身份 Token 或原始异常写入运行事件。", nextStep: "检查可信身份提供方和 Bootstrap 持久化 Adapter。",
      correlationId: randomUUID(), relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [],
    });
    if (unauthenticated) return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
    return Response.json({ error: { code: "BOOTSTRAP_NOT_CONFIGURED", message: "管理员初始化依赖未配置。" } }, { status: 503 });
  }
}
