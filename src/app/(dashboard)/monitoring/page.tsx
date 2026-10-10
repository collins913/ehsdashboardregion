import { forbidden } from "next/navigation";
import { MonitoringPageContent } from "@/features/monitoring/monitoring-page-content";
import { getMonitoringRepository } from "@/data/server/monitoring/monitoring-runtime.server";
import type { MonitoringSnapshot } from "@/data/contracts/monitoring";
import { currentAccess } from "@/lib/access/access-service.server";
import { seedMonitoringDemoData } from "@/data/server/testing/seed-monitoring-demo-data";

export const dynamic = "force-dynamic";

const emptySnapshot = (): MonitoringSnapshot => ({
  incidents: [],
  events: [],
  notifications: [],
  jobs: [],
  audit: [],
  sampledAt: new Date().toISOString() as MonitoringSnapshot["sampledAt"],
});

export default async function MonitoringPage() {
  const { effective } = await currentAccess();
  if (!effective.canManageAccess) forbidden();

  try {
    const repository = getMonitoringRepository();
    if (process.env.NODE_ENV !== "production") await seedMonitoringDemoData(repository);
    const snapshot = await repository.listSnapshot({}, new Date().toISOString() as MonitoringSnapshot["sampledAt"]);
    return <MonitoringPageContent initialSnapshot={snapshot} storageMode={process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT_MEMORY"} />;
  } catch {
    return <MonitoringPageContent initialSnapshot={emptySnapshot()} storageMode="UNAVAILABLE" />;
  }
}
