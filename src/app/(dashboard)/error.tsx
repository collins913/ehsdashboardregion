"use client";

import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { reportClientOperationalError } from "@/features/monitoring/report-client-error";

export default function DashboardError({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  useEffect(() => { reportClientOperationalError("BOUNDARY_ERROR", error.digest); }, [error.digest]);
  return (
    <PageContainer className="space-y-3">
      <AsyncQueryFeedback status="ERROR" />
      <Button variant="outline" onClick={reset}>
        重试
      </Button>
    </PageContainer>
  );
}
