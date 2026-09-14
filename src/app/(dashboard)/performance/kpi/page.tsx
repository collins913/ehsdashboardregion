import { PageHeader } from "@/components/shared/page-header";
import { routes } from "@/config/navigation";
import { KpiPageContent } from "@/features/kpi/kpi-page-content";
import { queryKpiRows } from "@/data/server/ehs-query-actions";

export default function KpiPage() {
  const route = routes.performanceKpi;

  return (
    <>
      <PageHeader
        title={route.title}
        description="查看当前筛选范围内各门店的 EHS 关键绩效指标"
        breadcrumbs={[{ label: route.section }, { label: route.title }]}
      />
      <KpiPageContent queryRows={queryKpiRows} />
    </>
  );
}
