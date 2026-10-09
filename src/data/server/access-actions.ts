"use server";
import { randomUUID } from "node:crypto";
import type { AccessQuery, AccessType, GrantInput, GrantUpdate, MutationResult } from "@/data/contracts/access";
import { createManualGrant, deleteManualGrant, getAccessCatalog, listManualGrants, queryAuditLog, updateManualGrant } from "@/lib/access/access-service.server";
import { isValidEmail } from "@/lib/access/access-domain";
import { recordOperationalEvent } from "@/data/server/monitoring/monitoring-service.server";
import {
  InvalidQueryInputError,
  parseAccessAuditFilter,
  parseAccessQuery,
} from "@/data/server/query-input-validation";

const accessTypes: readonly AccessType[] = ["GLOBAL_USER", "GLOBAL_ADMIN", "REGION", "AREA", "STORE"];

function invalidInput(): MutationResult<never> {
  return { ok: false, code: "INVALID_INPUT", message: "提交内容无效，请检查后重试。" };
}

function parseGrantUpdate(value: unknown): GrantUpdate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.accessType !== "string" || !accessTypes.includes(input.accessType as AccessType)) return null;
  if (input.note !== null && typeof input.note !== "string") return null;
  const global = input.accessType === "GLOBAL_USER" || input.accessType === "GLOBAL_ADMIN";
  if (global && input.scopeId !== null) return null;
  if (!global && (typeof input.scopeId !== "string" || !input.scopeId.trim())) return null;
  return {
    accessType: input.accessType as AccessType,
    scopeId: global ? null : (input.scopeId as string).trim(),
    note: input.note as string | null,
  };
}

function parseGrantInput(value: unknown): GrantInput | null {
  const update = parseGrantUpdate(value);
  if (!update || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const email = (value as Record<string, unknown>).email;
  if (typeof email !== "string" || !isValidEmail(email)) return null;
  return { ...update, email: email.trim() };
}

function parseMutationId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadAccessCatalog() { return withAccessCapture("权限目录查询", () => getAccessCatalog()); }
async function withAccessCapture<T>(component: string, action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) {
    const expected = error instanceof Error && ["NOT_AUTHORIZED", "NOT_AUTHENTICATED", "INVALID_QUERY_INPUT"].includes(error.message);
    await recordOperationalEvent({
      environment: process.env.NODE_ENV ?? "unknown", source: "Server Action", component,
      severity: expected ? "INFO" : "ERROR", errorCode: error instanceof Error && error.message === "NOT_AUTHORIZED" ? "ACCESS_DENIED" : error instanceof Error && error.message === "NOT_AUTHENTICATED" ? "AUTHENTICATION_REQUIRED" : error instanceof InvalidQueryInputError ? "INVALID_QUERY_INPUT" : "ACCESS_ACTION_FAILED",
      safeMessage: expected ? "权限管理请求未通过服务端校验。" : "权限管理请求处理失败。", phenomenon: "服务端访问管理操作未正常完成。",
      causeStatus: expected ? "KNOWN" : "UNKNOWN", knownCause: expected ? "身份、权限或请求参数校验未通过。" : null,
      impact: { kind: "SYSTEM", id: component, summary: "权限管理功能可能暂时不可用。" },
      actionTaken: "未记录邮箱、原始异常消息或堆栈。", nextStep: "管理员请检查服务端监控诊断。", correlationId: randomUUID(),
      relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [],
    });
    throw error;
  }
}
async function captureAccessWriteFailure(component: string, code: string) {
  await recordOperationalEvent({
    environment: process.env.NODE_ENV ?? "unknown", source: "Enterprise Access", component,
    severity: code === "WRITE_FAILED" ? "ERROR" : "INFO", errorCode: code === "WRITE_FAILED" ? "ACCESS_PERSISTENCE_FAILED" : "ACCESS_OPERATION_REJECTED",
    safeMessage: code === "WRITE_FAILED" ? "权限变更未能保存。" : "权限变更请求未通过规则校验。",
    phenomenon: "访问控制变更未按请求完成。", causeStatus: code === "WRITE_FAILED" ? "UNKNOWN" : "KNOWN",
    knownCause: code === "WRITE_FAILED" ? null : "服务端拒绝了不符合授权或输入规则的操作。",
    impact: { kind: "SYSTEM", id: "access", summary: "访问控制变更未完成。" },
    actionTaken: "未向监控事件写入账号邮箱或原始异常。", nextStep: "查看操作结果及管理员审计记录。",
    correlationId: randomUUID(), relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [],
  });
}
export async function loadManualGrants(query: AccessQuery & { accessType?: string }) {
  return withAccessCapture("权限列表查询", async () => {
    const parsed = parseAccessQuery(query);
    if (parsed === null) throw new InvalidQueryInputError();
    return listManualGrants(parsed);
  });
}
export async function submitGrant(input: unknown): Promise<MutationResult<string>> {
  const parsed = parseGrantInput(input);
  const result = parsed ? await withAccessCapture("新增访问授权", () => createManualGrant(parsed)) : invalidInput();
  if (!result.ok && result.code === "WRITE_FAILED") await captureAccessWriteFailure("新增访问授权", result.code);
  return result;
}
export async function reviseGrant(id: unknown, input: unknown): Promise<MutationResult<string>> {
  const parsedId = parseMutationId(id);
  const parsed = parseGrantUpdate(input);
  const result = parsedId && parsed ? await withAccessCapture("更新访问授权", () => updateManualGrant(parsedId, parsed)) : invalidInput();
  if (!result.ok && result.code === "WRITE_FAILED") await captureAccessWriteFailure("更新访问授权", result.code);
  return result;
}
export async function removeGrant(id: unknown): Promise<MutationResult<string>> {
  const parsedId = parseMutationId(id);
  const result = parsedId ? await withAccessCapture("删除访问授权", () => deleteManualGrant(parsedId)) : invalidInput();
  if (!result.ok && result.code === "WRITE_FAILED") await captureAccessWriteFailure("删除访问授权", result.code);
  return result;
}
export async function loadAuditLog(email: string) {
  return withAccessCapture("权限审计查询", async () => {
    const parsed = parseAccessAuditFilter(email);
    if (parsed === null) throw new InvalidQueryInputError();
    return queryAuditLog(parsed);
  });
}
