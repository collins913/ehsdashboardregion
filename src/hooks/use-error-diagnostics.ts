"use client";

import { useEffect, useState } from "react";
import { QueryError, queryErrorDigest, type ErrorDiagnostics } from "@/data/contracts/query-result";
import { pageErrorCode } from "@/data/contracts/error-presentation";
import { reportPageError } from "@/data/server/error-diagnostics-actions";

export function useErrorDiagnostics(error?: Error & { digest?: string }, preview = false) {
  const [state, setState] = useState<{
    path: string; displayedAt: string; code: ReturnType<typeof pageErrorCode>;
    sourceError: typeof error; preview: boolean;
    diagnostics?: ErrorDiagnostics; reporting: "PENDING" | "RECORDED" | "FAILED" | "PREVIEW";
  } | null>(null);

  useEffect(() => {
    let active = true;
    const path = window.location.pathname;
    const code = pageErrorCode(error, navigator.onLine === false);
    const diagnostics = error instanceof QueryError ? error.diagnostics : undefined;
    const base = { path, code, displayedAt: new Date().toISOString(), sourceError: error, preview };
    if (preview) {
      setState({ ...base, reporting: "PREVIEW" });
    } else if (diagnostics) {
      setState({ ...base, diagnostics, reporting: "RECORDED" });
    } else {
      setState({ ...base, reporting: "PENDING" });
      void Promise.resolve().then(() => reportPageError({ path, code, digest: queryErrorDigest(error) })).then(
        (result) => { if (active) setState({ ...base, diagnostics: result, reporting: "RECORDED" }); },
        () => { if (active) setState({ ...base, reporting: "FAILED" }); },
      );
    }
    return () => { active = false; };
  }, [error, preview]);

  return state?.sourceError === error && state?.preview === preview ? state : null;
}
