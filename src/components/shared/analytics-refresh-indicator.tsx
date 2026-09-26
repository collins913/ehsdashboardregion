import { LoaderCircle } from "lucide-react";

export function AnalyticsRefreshIndicator({ refreshing }: { refreshing: boolean }) {
  if (!refreshing) return null;

  return (
    <div className="absolute -top-6 right-0 z-10 flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
      更新中
    </div>
  );
}
