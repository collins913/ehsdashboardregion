export type QueryErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACCESS_DENIED"
  | "INVALID_QUERY_INPUT"
  | "SERVICE_UNAVAILABLE";

export type ErrorDiagnostics = { requestId: string; occurredAt: string; origin: "SERVER_QUERY" | "CLIENT_REPORT" };
export type QueryFailure = { queryError: { code: QueryErrorCode; diagnostics?: ErrorDiagnostics } };
export type QueryOutcome<T> = T | QueryFailure;

const messages: Record<QueryErrorCode, string> = {
  AUTHENTICATION_REQUIRED: "登录状态已失效，请重新登录。",
  ACCESS_DENIED: "当前账号无权查看所选范围。",
  INVALID_QUERY_INPUT: "查询条件无效，请重新选择。",
  SERVICE_UNAVAILABLE: "数据请求未能完成，具体原因待排查。请稍后重试。",
};

export function queryErrorMessage(code: QueryErrorCode = "SERVICE_UNAVAILABLE", diagnostics?: ErrorDiagnostics): string {
  return messages[code] + (diagnostics ? `（错误代码：${code}；${diagnostics.origin === "CLIENT_REPORT" ? "上报请求编号" : "查询请求编号"}：${diagnostics.requestId}）` : "");
}

export class QueryError extends Error {
  constructor(readonly code: QueryErrorCode, readonly diagnostics?: ErrorDiagnostics) {
    super(code === "ACCESS_DENIED" ? "NOT_AUTHORIZED" : code === "AUTHENTICATION_REQUIRED" ? "NOT_AUTHENTICATED" : messages[code]);
    this.name = "QueryError";
  }
}

/** Only stable codes and diagnostic references cross the server boundary; messages and stacks do not. */
export function queryErrorCode(error: unknown): QueryErrorCode {
  if (error && typeof error === "object" && "code" in error &&
    typeof error.code === "string" && Object.hasOwn(messages, error.code)) {
    return error.code as QueryErrorCode;
  }
  return "SERVICE_UNAVAILABLE";
}

export function queryFailure(error: unknown): QueryFailure {
  return { queryError: { code: queryErrorCode(error) } };
}

export function queryErrorDigest(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("digest" in error)) return undefined;
  return typeof error.digest === "string" && /^[\w-]{1,128}$/.test(error.digest) ? error.digest : undefined;
}

export function unwrapQueryOutcome<T>(outcome: QueryOutcome<T>): T {
  if (outcome && typeof outcome === "object" && "queryError" in outcome) {
    throw new QueryError(queryErrorCode(outcome.queryError), outcome.queryError.diagnostics);
  }
  return outcome as T;
}
