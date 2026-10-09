import "server-only";

export function clientOperationalErrorRateLimit(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number(env.EHS_MONITORING_CLIENT_REPORT_LIMIT_PER_MINUTE ?? "20");
  return Number.isInteger(configured) && configured >= 1 && configured <= 100 ? configured : 20;
}
