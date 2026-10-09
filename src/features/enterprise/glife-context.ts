export interface GLifeProfile {
  displayName: string | null;
  email: string | null;
  enterpriseUserId: string | null;
  employeeId: string | null;
  department: string | null;
  title: string | null;
}

export function isTrustedGLifeMessage(event: Pick<MessageEvent, "origin" | "source">, expectedOrigin: string, parent: MessageEventSource | null): boolean {
  return expectedOrigin.length > 0 && event.origin === expectedOrigin && event.source === parent;
}

const allowedKeys = new Set(["userId", "teslaId", "name", "email", "department", "title", "mobile", "nameLocked", "publicMediaToken"]);
function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseGLifeContextMessage(input: unknown): GLifeProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const envelope = input as Record<string, unknown>;
  if (envelope.type !== "GLIFE_CONTEXT" || !envelope.payload || typeof envelope.payload !== "object" || Array.isArray(envelope.payload)) return null;
  const payload = envelope.payload as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) return null;
  if (["userId", "teslaId", "name", "email", "department", "title", "mobile", "publicMediaToken"].some((key) => payload[key] !== undefined && payload[key] !== null && typeof payload[key] !== "string")) return null;
  if (payload.nameLocked !== undefined && payload.nameLocked !== null && typeof payload.nameLocked !== "boolean") return null;
  return {
    displayName: optionalText(payload.name),
    email: optionalText(payload.email),
    enterpriseUserId: optionalText(payload.userId),
    employeeId: optionalText(payload.teslaId),
    department: optionalText(payload.department),
    title: optionalText(payload.title),
  };
}
