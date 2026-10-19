import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : undefined;
  console.error(JSON.stringify({
    event: "server_request_error", requestId: crypto.randomUUID(), occurredAt: new Date().toISOString(),
    digest, path: request.path.split(/[?#]/)[0], method: request.method,
    route: context.routePath, routeType: context.routeType,
  }), error);
};
