import { KpiPageContent } from "@/features/kpi/kpi-page-content";
import {
  queryActions,
  queryKpiAstmDetails,
  queryKpiDrillDetails,
  queryKpiInspectionDetails,
  queryKpiRows,
  queryKpiTrainingDetails,
} from "@/data/server/ehs-query-actions";

export default function KpiPage() {
  return (
    <KpiPageContent
      queryRows={queryKpiRows}
      queryActions={queryActions}
      queryKpiDetails={{
        training: queryKpiTrainingDetails,
        drill: queryKpiDrillDetails,
        inspections: queryKpiInspectionDetails,
        astmEvents: queryKpiAstmDetails,
      }}
    />
  );
}
