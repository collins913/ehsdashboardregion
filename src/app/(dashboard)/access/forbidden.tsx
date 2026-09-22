import { getCurrentIdentity } from "@/data/repositories/access/mock-identity.server";
import { AccessForbidden } from "@/features/access-management/access-forbidden";

export default function Forbidden() {
  return <AccessForbidden identity={getCurrentIdentity()} />;
}
