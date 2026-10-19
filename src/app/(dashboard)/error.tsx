"use client";

import { PageErrorState } from "@/components/shared/page-error-state";

export default function DashboardError({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return <PageErrorState error={error} reset={reset} />;
}
