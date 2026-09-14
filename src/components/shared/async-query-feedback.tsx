import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { Skeleton } from "@/components/ui/skeleton";

export function AsyncQueryFeedback({
  status,
}: {
  status: "LOADING" | "ERROR";
}) {
  if (status === "ERROR") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        <DataAvailabilityDisplay availability="UNAVAILABLE" />
        <span>数据查询失败，请稍后重试。</span>
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
