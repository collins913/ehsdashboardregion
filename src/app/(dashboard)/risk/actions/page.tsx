import { PageHeader } from "@/components/shared/page-header";
import { routes } from "@/config/navigation";
import { ActionsPageContent } from "@/features/actions/actions-page-content";

export default function ActionsPage() {
  const route = routes.riskActions;

  return (
    <>
      <PageHeader
        title={route.title}
        description="查看当前筛选范围内的行动项及处理状态"
        breadcrumbs={[{ label: route.section }, { label: route.title }]}
      />
      <ActionsPageContent />
    </>
  );
}
