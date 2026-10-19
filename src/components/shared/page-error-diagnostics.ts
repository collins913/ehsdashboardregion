export interface PageErrorDiagnostics {
  digest: string;
  path: string;
  occurredAt: string;
  scope: string;
  code?: string; reason?: string; advice?: string; requestId?: string; loggedAt?: string; reporting?: string; idKind?: string;
}

export function formatPageErrorDiagnostics(info: PageErrorDiagnostics): string {
  return [
    `错误范围：${info.scope}`,
    `错误编号：${info.digest}`,
    `页面路径：${info.path}`,
    `页面显示时间（UTC）：${info.occurredAt}`,
    ...(info.code ? [`错误代码：${info.code}`, `原因说明：${info.reason}`, `处理建议：${info.advice}`, `请求编号：${info.requestId}`, `编号用途：${info.idKind}`, `服务端记录时间（UTC）：${info.loggedAt}`, `日志记录状态：${info.reporting}`] : []),
  ].join("\n");
}
