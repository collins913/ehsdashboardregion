"use client";

import { PageErrorState } from "@/components/shared/page-error-state";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="zh-CN"><body><PageErrorState error={error} reset={reset} system /></body></html>;
}
