export type QueryErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACCESS_DENIED"
  | "INVALID_QUERY_INPUT"
  | "SERVICE_UNAVAILABLE";

export type QueryFailure = { queryError: { code: QueryErrorCode } };
export type QueryOutcome<T> = T | QueryFailure;

const messages: Record<QueryErrorCode, string> = {
  AUTHENTICATION_REQUIRED: "登录状态已失效，请重新登录。",
  ACCESS_DENIED: "当前账号无权查看所选范围。",
  INVALID_QUERY_INPUT: "查询条件无效，请重新选择。",
  SERVICE_UNAVAILABLE: "数据服务暂不可用，请稍后重试。",
};

export function queryErrorMessage(code: QueryErrorCode = "SERVICE_UNAVAILABLE"): string {
  return messages[code];
}

export class QueryError extends Error {
  constructor(readonly code: QueryErrorCode) {
    super(code === "ACCESS_DENIED" ? "NOT_AUTHORIZED" : code === "AUTHENTICATION_REQUIRED" ? "NOT_AUTHENTICATED" : messages[code]);
    this.name = "QueryError";
  }
}

/** Only stable codes cross the server boundary; exception messages and stacks do not. */
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

export function unwrapQueryOutcome<T>(outcome: QueryOutcome<T>): T {
  if (outcome && typeof outcome === "object" && "queryError" in outcome) {
    throw new QueryError(queryErrorCode(outcome.queryError));
  }
  return outcome as T;
}
