"use client";

import { useEffect } from "react";
import { reportClientOperationalError } from "./report-client-error";

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = () => reportClientOperationalError("UNHANDLED_ERROR");
    const onUnhandledRejection = () => reportClientOperationalError("UNHANDLED_REJECTION");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
  return null;
}
