import "server-only";
import type { FirstAdminBootstrapStore } from "@/data/repositories/access/first-admin-bootstrap";

export function createConfiguredFirstAdminBootstrapStore(): FirstAdminBootstrapStore {
  throw new Error("FIRST_ADMIN_BOOTSTRAP_STORE_NOT_CONFIGURED");
}
