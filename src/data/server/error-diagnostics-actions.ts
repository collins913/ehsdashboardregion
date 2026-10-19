"use server";

import { logClientErrorReport } from "./error-diagnostics.server";
import { isErrorDisplayCode } from "@/data/contracts/error-presentation";

export async function reportPageError(input: { path: string; digest?: string; code: string }) {
  if (!input || typeof input.path !== "string" || !input.path.startsWith("/") || input.path.length > 512 || input.path.includes("?") || input.path.includes("#") || !isErrorDisplayCode(input.code) ||
    (input.digest !== undefined && (typeof input.digest !== "string" || !/^[\w-]{1,128}$/.test(input.digest)))) {
    throw new Error("INVALID_ERROR_REPORT");
  }
  return logClientErrorReport({ path: input.path, code: input.code, ...(input.digest ? { digest: input.digest } : {}) });
}
