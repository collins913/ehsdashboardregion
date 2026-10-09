"use client";

import type { ClientOperationalErrorKind } from "@/data/contracts/monitoring-validation";

export function reportClientOperationalError(kind: ClientOperationalErrorKind, digest?: string | null) {
  if (typeof window === "undefined") return;
  const route = window.location.pathname.replace(/[^A-Za-z0-9/_-]/g, "").slice(0, 180) || "/";
  const safeDigest = typeof digest === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(digest) ? digest : null;
  void fetch("/api/monitoring/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, route, digest: safeDigest }),
    keepalive: true,
  }).catch(() => undefined);
}
