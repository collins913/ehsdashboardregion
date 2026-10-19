"use client";

import { useState } from "react";
import { Copy, FileWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { applicationName } from "@/config/navigation";
import { formatPageErrorDiagnostics } from "./page-error-diagnostics";

import { useErrorDiagnostics } from "@/hooks/use-error-diagnostics";
import { errorPresentation, pageErrorCode } from "@/data/contracts/error-presentation";
import { queryErrorDigest } from "@/data/contracts/query-result";

export function PageErrorState({ reset, system = false, error, preview = false }: { reset: () => void; system?: boolean; error?: Error & { digest?: string }; preview?: boolean }) {
  const state = useErrorDiagnostics(error, preview);
  const [copyStatus, setCopyStatus] = useState("");
  const code = state?.code ?? pageErrorCode(error);
  const presentation = errorPresentation(code);
  const diagnostics = state ? {
    digest: queryErrorDigest(error) || "未提供", path: state.path,
    occurredAt: state.displayedAt, scope: system ? "系统页面" : "普通页面",
    code, reason: presentation.reason, advice: presentation.advice,
    requestId: state.diagnostics?.requestId ?? "未取得",
    loggedAt: state.diagnostics?.occurredAt ?? "未取得",
    reporting: state.reporting,
    idKind: state.diagnostics ? state.diagnostics.origin === "CLIENT_REPORT" ? "错误上报请求" : "原始查询请求" : "未取得编号",
  } : null;

  async function copyDiagnostics() {
    if (!diagnostics) return;
    try {
      await navigator.clipboard.writeText(formatPageErrorDiagnostics(diagnostics));
      setCopyStatus("已复制，可发送给管理员。");
    } catch {
      setCopyStatus("复制失败，请手动选择下方信息复制。");
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-6 py-12 text-foreground">
      <p className="text-sm font-medium text-muted-foreground">{applicationName}</p>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <FileWarning aria-hidden="true" className="size-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{system ? "系统页面暂时无法显示" : "页面暂时无法显示"}</h1>
            <CardDescription>{presentation.reason}</CardDescription>
            <p className="text-sm text-muted-foreground">{presentation.advice}</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <Button onClick={reset}>
            <RefreshCw aria-hidden="true" data-icon="inline-start" />
            重新加载
          </Button>
          <section aria-label="排查信息" className="w-full space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">排查信息</h2>
              <Button variant="outline" size="sm" onClick={copyDiagnostics} disabled={!diagnostics}>
                <Copy aria-hidden="true" data-icon="inline-start" />
                复制排查信息
              </Button>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
              <dt className="text-muted-foreground">错误代码</dt>
              <dd className="select-text break-all font-mono">{code}</dd>
              <dt className="text-muted-foreground">{state?.diagnostics?.origin === "CLIENT_REPORT" ? "上报请求编号" : "查询请求编号"}</dt>
              <dd className="select-text break-all font-mono">{diagnostics?.requestId ?? "—"}</dd>
              <dt className="text-muted-foreground">框架错误编号</dt>
              <dd className="select-text break-all font-mono">{diagnostics?.digest ?? "—"}</dd>
              <dt className="text-muted-foreground">页面路径</dt>
              <dd className="select-text break-all font-mono">{diagnostics?.path ?? "—"}</dd>
              <dt className="text-muted-foreground">页面显示时间（UTC）</dt>
              <dd className="select-text break-all font-mono">{diagnostics?.occurredAt ?? "—"}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">{preview ? "当前为样式预览，不上报故障，也不生成请求编号。" : state?.reporting === "RECORDED" ? (state.diagnostics?.origin === "CLIENT_REPORT" ? "上报已记录。管理员先查上报请求编号；如有框架错误编号，可继续关联原始异常日志。" : "查询请求编号已关联服务端异常日志。") : state?.reporting === "FAILED" ? "未能取得服务端日志编号，请复制现有信息交给管理员。" : "正在记录排查信息…"}</p>
            <p role="status" className="text-xs text-muted-foreground">{copyStatus}</p>
          </section>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-center text-xs text-muted-foreground">若重试后仍无法显示，请联系管理员。</p>
        </CardFooter>
      </Card>
    </main>
  );
}
