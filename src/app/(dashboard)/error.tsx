"use client";

import { usePathname } from "next/navigation";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { ANALYTICS_PAGE_CONTAINER_CLASS_NAME } from "@/components/shared/analytics-layout";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { getDashboardRoute } from "@/config/navigation";

export default function DashboardError({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  const route = getDashboardRoute(usePathname());
  return (
    <PageContainer className={`space-y-3 ${route?.showGlobalFilters === false ? "" : ANALYTICS_PAGE_CONTAINER_CLASS_NAME}`}>
      <AsyncQueryFeedback status="ERROR" />
      <Button variant="outline" onClick={reset}>
        重试
      </Button>
    </PageContainer>
  );
}
