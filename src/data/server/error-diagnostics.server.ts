import "server-only";
import { randomUUID } from "node:crypto";
import { queryFailure, type ErrorDiagnostics } from "@/data/contracts/query-result";

export function logQueryFailure(error: unknown, operation: string) {
  const failure = queryFailure(error);
  const diagnostics: ErrorDiagnostics = { requestId: randomUUID(), occurredAt: new Date().toISOString(), origin: "SERVER_QUERY" };
  console.error(JSON.stringify({ event: "query_failure", operation, code: failure.queryError.code, ...diagnostics }), error);
  return { queryError: { ...failure.queryError, diagnostics } };
}

export function logClientErrorReport(input: { path: string; digest?: string; code: string }): ErrorDiagnostics {
  const diagnostics: ErrorDiagnostics = { requestId: randomUUID(), occurredAt: new Date().toISOString(), origin: "CLIENT_REPORT" };
  // Client observations are explicitly labelled, never treated as verified server causes.
  console.error(JSON.stringify({ event: "client_error_report", ...diagnostics, ...input }));
  return diagnostics;
}
