import type { EnvironmentMonitoring } from "@/data/contracts/environment";
import { DetailField } from "./detail-field";

export function MonitoringDetail({ monitoring }: { monitoring: EnvironmentMonitoring }) {
  return (
    <section className="space-y-4">
      <dl><DetailField label="当前监测信息">{monitoring.monitoringText}</DetailField></dl>
      <p className="text-sm text-muted-foreground">详情字段待定义</p>
    </section>
  );
}
