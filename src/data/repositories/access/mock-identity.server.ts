import "server-only";
import type { Identity } from "@/data/contracts/access";
import { MOCK_GLOBAL_ADMIN_EMAIL } from "@/data/mock/access-grants";
import { canonicalEmail } from "@/lib/access/access-domain";

// Mock development identity source. A production identity provider replaces this resolver.
export function getCurrentIdentity(): Identity {
  const email = canonicalEmail(process.env.EHS_MOCK_USER_EMAIL?.trim() || MOCK_GLOBAL_ADMIN_EMAIL);
  return {
    email,
    displayName: process.env.EHS_MOCK_USER_NAME?.trim() || (email === MOCK_GLOBAL_ADMIN_EMAIL ? "Waner Shangguan（上官婉儿）" : null),
    avatarUrl: process.env.EHS_MOCK_USER_AVATAR_URL?.trim() || null,
  };
}
