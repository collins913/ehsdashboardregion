import type { AuditEvent, GrantInput, GrantUpdate, ManualGrant } from "@/data/contracts/access";

/**
 * Actor identifiers must come from the verified server principal; the verified email remains the
 * current grant key while stable principalId is retained in the audit event. Production adapters must persist each grant mutation and append-only audit event in one
 * transaction. update/delete must also enforce the last-effective-admin invariant atomically,
 * not rely only on the Access Service's preflight check.
 */
export interface AccessRepository {
  listManualGrants(): Promise<readonly ManualGrant[]>;
  listAuditEvents(): Promise<readonly AuditEvent[]>;
  createManualGrant(input: GrantInput, actor: { principalId: string; verifiedEmail: string }, scopeDisplayName: string): Promise<ManualGrant>;
  updateManualGrant(id: string, input: GrantUpdate, actor: { principalId: string; verifiedEmail: string }, scopeDisplayName: string): Promise<ManualGrant | null>;
  deleteManualGrant(id: string, actor: { principalId: string; verifiedEmail: string }): Promise<boolean>;
}
