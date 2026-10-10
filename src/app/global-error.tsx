"use client";

import { useEffect } from "react";
import { reportClientOperationalError } from "@/features/monitoring/report-client-error";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientOperationalError("BOUNDARY_ERROR", error.digest); }, [error.digest]);
  return <html lang="zh-CN"><body><main style={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: 16, textAlign: "center", padding: 24 }}><h1>系统页面暂时无法显示</h1><p>请稍后重试；若问题持续，请联系管理员。</p><button onClick={reset}>重试</button></main></body></html>;
}
