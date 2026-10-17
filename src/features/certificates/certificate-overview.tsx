"use client";

import type { ReactNode } from "react";
import { AnalyticsProgressItem } from "@/components/shared/analytics-progress-item";
import { Separator } from "@/components/ui/separator";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CertificateOverviewResult } from "@/data/contracts/certificates";
import type { DataAvailability } from "@/data/contracts/kpi";

function CertificateOverviewCardFrame({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-0 pt-0 pb-4">
      <CardHeader className="items-center gap-3 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="truncate">证件配置概览</CardTitle>
          {status}
        </div>
        <CardAction className="self-center whitespace-nowrap text-xs text-muted-foreground">数量：实际 / 应持有</CardAction>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-0">{children}</CardContent>
    </Card>
  );
}

export function CertificateOverviewPlaceholder({ loading = false, message = "数据查询失败，请稍后重试。" }: { loading?: boolean; message?: string }) {
  return (
    <section className="space-y-3" aria-label="证件配置概览" aria-busy={loading || undefined}>
      <CertificateOverviewCardFrame>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {loading ? <Skeleton className="h-40 w-full" /> : <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </CertificateOverviewCardFrame>
    </section>
  );
}

export function CertificateOverview({
  availability,
  overview,
  refreshing = false,
}: {
  availability: DataAvailability;
  overview: CertificateOverviewResult;
  refreshing?: boolean;
}) {
  return (
    <section className="relative space-y-3" aria-label="证件配置概览" aria-busy={refreshing || undefined}>
      <AnalyticsRefreshIndicator refreshing={refreshing} />
      <CertificateOverviewCardFrame status={availability === "INCOMPLETE" ? <DataAvailabilityDisplay availability="INCOMPLETE" /> : null}>
        {availability === "UNAVAILABLE" ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <DataAvailabilityDisplay availability="UNAVAILABLE" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-flow-col auto-cols-[minmax(14rem,1fr)]">
              {overview.groups.map((group, index) => (
                <section key={group.certificateCategory} aria-label={group.label} className="relative flex min-w-0 flex-col gap-3 px-4 first:pl-0 last:pr-0">
                  {index > 0 ? <Separator orientation="vertical" className="absolute inset-y-0 left-0" /> : null}
                  <h3 className="shrink-0 text-sm font-semibold">{group.label}</h3>
                  <ul aria-label={`${group.label}证件列表`} className="space-y-4 pb-1">
                      {overview.items.filter((item) => item.certificateCategory === group.certificateCategory).map((item) => (
                        <AnalyticsProgressItem key={item.certificateType} label={item.fullLabel} actualCount={item.actualCount} requiredCount={item.requiredCount} progressValue={item.progressValue} missingRequirementLabel="未设置" />
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}

      </CertificateOverviewCardFrame>
    </section>
  );
}
