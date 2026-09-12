import { PageHeader } from "@/components/shared/page-header";
import { routes } from "@/config/navigation";
import { EventsPageContent } from "@/features/events/events-page-content";

export default function EventsPage() {
  const route = routes.riskEvents;

  return (
    <>
      <PageHeader
        title={route.title}
        description="查看当前筛选范围内的事件及处理状态"
        breadcrumbs={[{ label: route.section }, { label: route.title }]}
      />
      <EventsPageContent />
    </>
  );
}
