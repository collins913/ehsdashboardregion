"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientOperationalError } from "@/features/monitoring/report-client-error";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientOperationalError("BOUNDARY_ERROR", error.digest); }, [error.digest]);
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-xl font-semibold">页面暂时无法显示</h1><p className="text-sm text-muted-foreground">请稍后重试；若问题持续，请联系管理员。</p><Button variant="outline" onClick={reset}>重试</Button></main>;
}
