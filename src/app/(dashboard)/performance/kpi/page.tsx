import { KpiPageContent } from "@/features/kpi/kpi-page-content";
import { queryActions, queryKpiRows } from "@/data/server/ehs-query-actions";

export default function KpiPage() {
  return <KpiPageContent queryRows={queryKpiRows} queryActions={queryActions} />;
}
