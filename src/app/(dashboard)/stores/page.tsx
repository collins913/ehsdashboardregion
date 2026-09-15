import { StoresPageContent } from "@/features/stores/stores-page-content";
import { queryStores } from "@/data/server/ehs-query-actions";

export default function StoresPage() {
  return <StoresPageContent queryStores={queryStores} />;
}
