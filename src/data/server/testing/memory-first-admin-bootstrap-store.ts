import type { FirstAdminBootstrapResult, FirstAdminBootstrapStore } from "@/data/repositories/access/first-admin-bootstrap";

/** Test-only atomic one-time gate; production must use the Access persistence transaction. */
export class MemoryFirstAdminBootstrapStore implements FirstAdminBootstrapStore {
  private initialized: { principalId: string; verifiedEmail: string; initializedAt: string } | null = null;
  async initializeFirstAdmin(input: { principalId: string; verifiedEmail: string; initializedAt: string }): Promise<FirstAdminBootstrapResult> {
    if (this.initialized) return "ALREADY_INITIALIZED";
    this.initialized = input;
    return "INITIALIZED";
  }
  value() { return this.initialized; }
}
