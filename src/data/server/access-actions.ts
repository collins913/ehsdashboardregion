"use server";
import { queryFailure, type QueryOutcome } from "@/data/contracts/query-result";
import type { AccessQuery, AccessType, GrantInput, GrantUpdate, MutationResult } from "@/data/contracts/access";
import { createManualGrant, deleteManualGrant, getAccessCatalog, listManualGrants, queryAuditLog, updateManualGrant } from "@/lib/access/access-service.server";
import { isValidEmail } from "@/lib/access/access-domain";
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
  if (input.name !== undefined && input.name !== null && typeof input.name !== "string") return null;
  if (typeof input.accessType !== "string" || !accessTypes.includes(input.accessType as AccessType)) return null;
  if (input.note !== null && typeof input.note !== "string") return null;
  const global = input.accessType === "GLOBAL_USER" || input.accessType === "GLOBAL_ADMIN";
  if (global && input.scopeId !== null) return null;
  if (!global && (typeof input.scopeId !== "string" || !input.scopeId.trim())) return null;
  return {
    ...(input.name !== undefined ? { name: typeof input.name === "string" ? input.name.trim() || null : null } : {}),
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

export async function loadAccessCatalog() { return withAccessQueryOutcome(() => getAccessCatalog()); }
async function withAccessQueryOutcome<T>(action: () => Promise<T>): Promise<QueryOutcome<T>> {
  try { return await action(); }
  catch (error) { return queryFailure(error); }
}
export async function loadManualGrants(query: AccessQuery & { accessType?: string }) {
  return withAccessQueryOutcome(async () => {
    const parsed = parseAccessQuery(query);
    if (parsed === null) throw new InvalidQueryInputError();
    return listManualGrants(parsed);
  });
}
export async function submitGrant(input: unknown): Promise<MutationResult<string>> {
  const parsed = parseGrantInput(input);
  const result = parsed ? await createManualGrant(parsed) : invalidInput();
  return result;
}
export async function reviseGrant(id: unknown, input: unknown): Promise<MutationResult<string>> {
  const parsedId = parseMutationId(id);
  const parsed = parseGrantUpdate(input);
  const result = parsedId && parsed ? await updateManualGrant(parsedId, parsed) : invalidInput();
  return result;
}
export async function removeGrant(id: unknown): Promise<MutationResult<string>> {
  const parsedId = parseMutationId(id);
  const result = parsedId ? await deleteManualGrant(parsedId) : invalidInput();
  return result;
}
export async function loadAuditLog(email: string) {
  return withAccessQueryOutcome(async () => {
    const parsed = parseAccessAuditFilter(email);
    if (parsed === null) throw new InvalidQueryInputError();
    return queryAuditLog(parsed);
  });
}
