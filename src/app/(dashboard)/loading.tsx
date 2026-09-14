import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";

export default function DashboardLoading() {
  return (
    <PageContainer>
      <AsyncQueryFeedback status="LOADING" />
    </PageContainer>
  );
}
