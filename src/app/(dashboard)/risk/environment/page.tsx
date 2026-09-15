import { queryEnvironment } from "@/data/server/ehs-query-actions";
import { EnvironmentPageContent } from "@/features/environment/environment-page-content";

export default function EnvironmentPage() {
  return <EnvironmentPageContent queryEnvironment={queryEnvironment} />;
}
