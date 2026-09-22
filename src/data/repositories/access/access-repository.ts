import type { AuditEvent, GrantInput, GrantUpdate, ManualGrant } from "@/data/contracts/access";

// Production implementations must persist the grant and its audit event atomically.
export interface AccessRepository {
  listManualGrants(): Promise<readonly ManualGrant[]>;
  listAuditEvents(): Promise<readonly AuditEvent[]>;
  createManualGrant(input: GrantInput, actorEmail: string, scopeDisplayName: string): Promise<ManualGrant>;
  updateManualGrant(id: string, input: GrantUpdate, actorEmail: string, scopeDisplayName: string): Promise<ManualGrant | null>;
  deleteManualGrant(id: string, actorEmail: string): Promise<boolean>;
}
