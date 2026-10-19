import { QueryError, type QueryErrorCode } from "@/data/contracts/query-result";

export type ErrorDisplayCode = QueryErrorCode | "UNKNOWN_ERROR" | "BROWSER_OFFLINE";

const presentations: Record<ErrorDisplayCode, { reason: string; advice: string }> = {
  AUTHENTICATION_REQUIRED: { reason: "登录状态已失效。", advice: "请重新登录后重试。" },
  ACCESS_DENIED: { reason: "当前账号无权访问所选范围。", advice: "请切换到有权限的范围，或联系管理员核对授权。" },
  INVALID_QUERY_INPUT: { reason: "提交的查询条件无效。", advice: "请重新选择筛选条件后重试。" },
  SERVICE_UNAVAILABLE: { reason: "数据请求未能完成，具体原因待排查。", advice: "请重试；若持续失败，将排查信息提供给管理员。" },
  BROWSER_OFFLINE: { reason: "浏览器当前报告为离线；尚不能确认是否为本次错误的原因。", advice: "请检查网络连接后重试；若仍失败，联系管理员。" },
  UNKNOWN_ERROR: { reason: "页面运行异常，具体原因待排查。", advice: "请重试；若持续失败，将排查信息提供给管理员。" },
};

export function isErrorDisplayCode(value: unknown): value is ErrorDisplayCode {
  return typeof value === "string" && Object.hasOwn(presentations, value);
}

export function errorPresentation(code: ErrorDisplayCode) { return presentations[code]; }

export function pageErrorCode(error?: Error, offline = false): ErrorDisplayCode {
  if (error instanceof QueryError) return error.code;
  return offline ? "BROWSER_OFFLINE" : "UNKNOWN_ERROR";
}
