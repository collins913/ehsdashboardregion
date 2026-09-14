import { PageHeader } from "@/components/shared/page-header";
import { routes } from "@/config/navigation";
import { StoresPageContent } from "@/features/stores/stores-page-content";

export default function StoresPage() {
  const route = routes.stores;

  return (
    <>
      <PageHeader
        title={route.title}
        description="浏览当前筛选范围内的门店主数据"
        breadcrumbs={[{ label: route.title }]}
      />
      <StoresPageContent />
    </>
  );
}
