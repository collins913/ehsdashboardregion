"use client";

import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <PageContainer className="space-y-3">
      <AsyncQueryFeedback status="ERROR" />
      <Button variant="outline" onClick={reset}>
        重试
      </Button>
    </PageContainer>
  );
}
