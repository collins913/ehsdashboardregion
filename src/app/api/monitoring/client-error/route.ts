import { randomUUID } from "node:crypto";
import { parseClientOperationalErrorReport } from "@/data/contracts/monitoring-validation";
import { clientOperationalErrorRateLimit } from "@/data/server/monitoring/client-error-policy.server";
import { getMonitoringRepository } from "@/data/server/monitoring/monitoring-runtime.server";
import { requireVerifiedServerPrincipal } from "@/data/server/identity-provider.server";
import { recordOperationalEvent } from "@/data/server/monitoring/monitoring-service.server";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

export const runtime = "nodejs";
const json = (code: string, status: number) => Response.json({ error: { code } }, { status });

export async function POST(request: Request) {
  let principal;
  try { principal = await requireVerifiedServerPrincipal(); }
  catch (error) { return json(error instanceof Error && error.message === "NOT_AUTHENTICATED" ? "AUTHENTICATION_REQUIRED" : "IDENTITY_PROVIDER_UNAVAILABLE", error instanceof Error && error.message === "NOT_AUTHENTICATED" ? 401 : 503); }
  if (!principal) return json("AUTHENTICATION_REQUIRED", 401);
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return json("JSON_CONTENT_TYPE_REQUIRED", 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 8_192) return json("REQUEST_TOO_LARGE", 413);
  let body: Awaited<ReturnType<typeof readBody>>;
  try { body = await readBody(request); } catch { return json("INVALID_REQUEST_BODY", 400); }
  if (body.kind === "TOO_LARGE") return json("REQUEST_TOO_LARGE", 413);
  if (!body.text) return json("INVALID_REQUEST_BODY", 400);
  let input: unknown;
  try { input = JSON.parse(body.text); } catch { return json("MALFORMED_JSON", 400); }
  const report = parseClientOperationalErrorReport(input);
  if (!report) return json("INVALID_ERROR_REPORT", 422);
  const requestHeader = request.headers.get("x-request-id") ?? request.headers.get("traceparent");
  const correlationId = requestHeader && /^[\w.:-]{1,200}$/.test(requestHeader) ? requestHeader : randomUUID();
  const now = new Date().toISOString() as TimezoneAwareIsoDateTime;
  try {
    const repository = getMonitoringRepository();
    if (!await repository.consumeClientErrorReport({ principalId: principal.principalId, now, limitPerMinute: clientOperationalErrorRateLimit() })) return json("RATE_LIMITED", 429);
    const errorCode = report.kind === "BOUNDARY_ERROR" ? "CLIENT_RENDER_ERROR"
      : report.kind === "DATA_REQUEST_FAILED" ? "CLIENT_DATA_REQUEST_FAILED" : "CLIENT_UNHANDLED_RUNTIME_ERROR";
    const result = await recordOperationalEvent({
      environment: process.env.NODE_ENV ?? "unknown", source: "Dashboard Client", component: report.route,
      severity: "ERROR", errorCode, safeMessage: "浏览器报告了未处理的运行错误。",
      phenomenon: report.kind === "BOUNDARY_ERROR" ? "页面渲染进入错误边界。" : "客户端运行时报告了未处理错误。",
      causeStatus: "UNKNOWN", knownCause: null,
      impact: { kind: "SYSTEM", id: report.route, summary: `客户端页面 ${report.route} 受到影响。` },
      actionTaken: "客户端已发送经过字段白名单过滤的错误报告。",
      nextStep: "请管理员查看系统监控中的 Incident 诊断。",
      correlationId, relatedBatchId: null, relatedJobId: null, relatedDomain: null,
      diagnostics: report.digest ? [{ code: "FRAMEWORK_DIGEST", severity: "INFO", message: `Framework digest: ${report.digest}` }] : [],
    }, { repository, now: () => now, throwOnStorageFailure: true });
    return Response.json({ accepted: true, eventId: result?.event.eventId ?? null }, { status: 202 });
  } catch {
    return json("MONITORING_STORAGE_UNAVAILABLE", 503);
  }
}

async function readBody(request: Request): Promise<{ kind: "OK"; text: string } | { kind: "TOO_LARGE" }> {
  if (!request.body) return { kind: "OK", text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8_192) { await reader.cancel(); return { kind: "TOO_LARGE" }; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { kind: "OK", text: new TextDecoder().decode(bytes) };
}
