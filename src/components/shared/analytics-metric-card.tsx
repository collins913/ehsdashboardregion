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
  emptyLabel = "—",
  valueFallback,
}: {
  title: string;
  value: number | null;
  subtitle?: string;
  info?: React.ReactNode;
  formatter?: (value: number) => string;
  loading?: boolean;
  emptyLabel?: string;
  valueFallback?: React.ReactNode;
}) {
  return (
    <Card className="gap-4 py-5 shadow-none">
      <CardHeader className="px-5">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-sm">
            {info ? (
              <HoverCard openDelay={125} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${title}指标说明`}
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
      </CardHeader>
      <CardContent className="px-5">
        {loading && value === null ? (
          <div className="flex h-8 items-center">
            <Skeleton className="h-7 w-16" aria-label="指标加载中" />
          </div>
        ) : value === null ? (
          valueFallback ?? <p className="text-2xl font-semibold tabular-nums">{emptyLabel}</p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums">
            <AnimatedNumber value={value} formatter={formatter} />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
