import { OverviewPage } from "@/features/overview/overview-page";
import { queryOverview } from "@/data/server/ehs-query-actions";

export default function DevOverviewPage() {
  return <OverviewPage queryOverview={queryOverview} />;
}
