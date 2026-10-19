import { type ErrorDiagnostics, type QueryErrorCode } from "@/data/contracts/query-result";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { Skeleton } from "@/components/ui/skeleton";
import { errorPresentation } from "@/data/contracts/error-presentation";

export function AsyncQueryFeedback({
  status,
  errorCode,
  diagnostics,
}: {
  status: "LOADING" | "ERROR";
  errorCode?: QueryErrorCode;
  diagnostics?: ErrorDiagnostics;
}) {
  if (status === "ERROR") {
    const code = errorCode ?? "SERVICE_UNAVAILABLE";
    const presentation = errorPresentation(code);
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        <DataAvailabilityDisplay availability="UNAVAILABLE" />
        <div className="space-y-2">
          <p>{presentation.reason}</p>
          <p>{presentation.advice}</p>
          <p className="break-all text-xs">错误代码：{code} · {diagnostics?.origin === "CLIENT_REPORT" ? "上报请求编号" : "查询请求编号"}：{diagnostics?.requestId ?? "未取得"}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 rounded-lg border border-dashed p-6"
      aria-label="正在加载数据"
      aria-busy="true"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
