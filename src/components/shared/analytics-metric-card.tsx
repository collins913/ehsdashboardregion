import { Info } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function AnalyticsMetricCard({
  title,
  value,
  subtitle,
  info,
  formatter,
  loading = false,
  size = "default",
  emptyLabel = "—",
  valueFallback,
}: {
  title: string;
  value: number | null;
  subtitle?: string;
  info?: React.ReactNode;
  formatter?: (value: number) => string;
  loading?: boolean;
  size?: "default" | "compact";
  emptyLabel?: string;
  valueFallback?: React.ReactNode;
}) {
  const compact = size === "compact";

  return (
    <Card className={compact ? "gap-4 py-5 shadow-none" : "flex min-h-40 flex-col justify-between gap-3 p-5"}>
      <CardHeader className={compact ? "px-5" : "flex flex-row items-start justify-between gap-2 space-y-0 p-0"}>
        <div className={compact ? "space-y-1.5" : "min-w-0 space-y-2"}>
          <CardTitle className={compact ? "text-sm" : "text-base leading-6"}>
            {compact && info ? (
              <HoverCard openDelay={250} closeDelay={150}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span>{title}</span>
                    <Info aria-hidden="true" className="size-3 text-muted-foreground" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" align="start">{info}</HoverCardContent>
              </HoverCard>
            ) : title}
          </CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </div>
        {!compact && info ? (
          <HoverCard openDelay={250} closeDelay={150}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                aria-label={`${title}指标说明`}
                className="mt-0.5 shrink-0 rounded-sm text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Info aria-hidden="true" className="size-4" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="end">{info}</HoverCardContent>
          </HoverCard>
        ) : null}
      </CardHeader>
      <CardContent className={compact ? "px-5" : "p-0"}>
        {loading && value === null ? (
          compact ? (
            <div className="flex h-8 items-center">
              <Skeleton className="h-7 w-16" aria-label="指标加载中" />
            </div>
          ) : (
            <Skeleton className="h-9 w-24" aria-label="指标加载中" />
          )
        ) : value === null ? (
          valueFallback ?? <p className={compact ? "text-2xl font-semibold tabular-nums" : "text-3xl font-semibold leading-none tracking-tight tabular-nums"}>{emptyLabel}</p>
        ) : (
          <p className={compact ? "text-2xl font-semibold tabular-nums" : "text-3xl font-semibold leading-none tracking-tight tabular-nums"}>
            <AnimatedNumber value={value} formatter={formatter} />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
