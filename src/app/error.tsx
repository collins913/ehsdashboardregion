"use client";

import { PageErrorState } from "@/components/shared/page-error-state";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageErrorState error={error} reset={reset} />;
}
