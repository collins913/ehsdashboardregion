import { currentAccess } from "@/lib/access/access-service.server";
import { forbidden } from "next/navigation";
import { AccessManagementPage } from "@/features/access-management/access-management-page";

export default async function Page() {
  const { effective } = await currentAccess();
  if (!effective.canManageAccess) forbidden();
  return <AccessManagementPage />;
}
