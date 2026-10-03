import { OverviewPage as OverviewFeaturePage } from "@/features/overview/overview-page";
import { queryOverview } from "@/data/server/ehs-query-actions";

export default function OverviewPage() {
  return <OverviewFeaturePage queryOverview={queryOverview} />;
}
