import { PageHeader } from "@/components/shared/page-header";
import { routes } from "@/config/navigation";
import { GoalsPageContent } from "@/features/goals/goals-page-content";

export default function GoalsPage() {
  const route = routes.performanceGoals;

  return (
    <>
      <PageHeader
        title={route.title}
        description="查看 Take Charge 提交、关闭与年度参与绩效"
        breadcrumbs={[{ label: route.section }, { label: route.title }]}
      />
      <GoalsPageContent />
    </>
  );
}
