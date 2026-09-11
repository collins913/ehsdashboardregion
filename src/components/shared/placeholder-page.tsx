import { GlobalFiltersPlaceholder } from "@/components/shared/global-filters-placeholder";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import type { NavigationItem } from "@/config/navigation";

type PlaceholderPageProps = {
  route: NavigationItem;
};

export function PlaceholderPage({ route }: PlaceholderPageProps) {
  const breadcrumbs = route.section
    ? [{ label: route.section }, { label: route.title }]
    : [{ label: route.title }];

  return (
    <>
      <PageHeader title={route.title} breadcrumbs={breadcrumbs} />
      <GlobalFiltersPlaceholder />
      <PageContainer>
        <p className="text-sm text-muted-foreground">
          业务内容将在后续阶段定义。
        </p>
      </PageContainer>
    </>
  );
}
