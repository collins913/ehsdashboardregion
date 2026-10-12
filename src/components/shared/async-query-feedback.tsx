import { queryErrorMessage, type QueryErrorCode } from "@/data/contracts/query-result";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { Skeleton } from "@/components/ui/skeleton";

export function AsyncQueryFeedback({
  status,
  errorCode,
}: {
  status: "LOADING" | "ERROR";
  errorCode?: QueryErrorCode;
}) {
  if (status === "ERROR") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        <DataAvailabilityDisplay availability="UNAVAILABLE" />
        <span>{queryErrorMessage(errorCode)}</span>
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
