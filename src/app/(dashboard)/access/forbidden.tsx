import { getVerifiedServerPrincipal } from "@/data/server/identity-provider.server";
import { AccessForbidden } from "@/features/access-management/access-forbidden";

export default async function Forbidden() {
  const principal = await getVerifiedServerPrincipal().catch(() => null);
  return <AccessForbidden identity={{ email: principal?.verifiedEmail ?? "未验证身份" }} />;
}
