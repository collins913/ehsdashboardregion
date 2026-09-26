import { ActionsPageContent } from "@/features/actions/actions-page-content";
import { queryActions, queryActionsAnalytics } from "@/data/server/ehs-query-actions";

export default function ActionsPage() {
  return <ActionsPageContent queryActions={queryActions} queryActionsAnalytics={queryActionsAnalytics} />;
}
