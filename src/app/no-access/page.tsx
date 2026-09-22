import { forbidden, redirect } from "next/navigation";
import { getAccountSummary } from "@/lib/access/access-service.server";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  if ((await getAccountSummary()).scopes.length > 0) redirect("/overview");
  forbidden();
}
