export type ClientOperationalErrorKind = "BOUNDARY_ERROR" | "UNHANDLED_ERROR" | "UNHANDLED_REJECTION" | "DATA_REQUEST_FAILED";

export interface ClientOperationalErrorReport {
  kind: ClientOperationalErrorKind;
  route: string;
  digest: string | null;
}

export function parseClientOperationalErrorReport(input: unknown): ClientOperationalErrorReport | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["kind", "route", "digest"].includes(key))) return null;
  const kinds: readonly string[] = ["BOUNDARY_ERROR", "UNHANDLED_ERROR", "UNHANDLED_REJECTION", "DATA_REQUEST_FAILED"];
  if (typeof value.kind !== "string" || !kinds.includes(value.kind)) return null;
  if (typeof value.route !== "string" || value.route.length > 180 || !/^\/[A-Za-z0-9/_-]*$/.test(value.route)) return null;
  if (value.digest !== null && (typeof value.digest !== "string" || value.digest.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(value.digest))) return null;
  return { kind: value.kind as ClientOperationalErrorKind, route: value.route, digest: value.digest as string | null };
}
