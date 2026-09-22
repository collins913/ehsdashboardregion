import "server-only";
import type { AccessRepository } from "@/data/repositories/access/access-repository";
import type { AuditEvent, GrantInput, GrantUpdate, ManualGrant } from "@/data/contracts/access";
import { mockManualGrants } from "@/data/mock/access-grants";

let grants: ManualGrant[] = mockManualGrants.map((grant) => ({ ...grant }));
const audit: AuditEvent[] = [];
let sequence = 0;
function nextId(prefix: string): string { sequence += 1; return `${prefix}-${String(sequence).padStart(8, "0")}`; }
function record(action: AuditEvent["action"], actorEmail: string, before: ManualGrant | null, after: ManualGrant | null) {
  const grant = after ?? before!;
  audit.push({ id: nextId("audit"), timestamp: new Date().toISOString(), action, actorEmail, targetEmail: grant.email, grantId: grant.id, scopeType: grant.accessType, scopeId: grant.scopeId, scopeDisplayName: grant.scopeDisplayName, before, after, note: grant.note });
}
export const mockAccessRepository: AccessRepository = {
  async listManualGrants() { return grants.map((grant) => ({ ...grant })); },
  async listAuditEvents() { return [...audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)); },
  async createManualGrant(input: GrantInput, actorEmail, scopeDisplayName) {
    const grant: ManualGrant = { ...input, id: nextId("grant"), scopeDisplayName, grantedBy: actorEmail, grantedAt: new Date().toISOString(), updatedBy: null, updatedAt: null };
    grants = [...grants, grant]; record("CREATE", actorEmail, null, grant); return grant;
  },
  async updateManualGrant(id: string, input: GrantUpdate, actorEmail, scopeDisplayName) {
    const before = grants.find((grant) => grant.id === id);
    if (!before) return null;
    const after: ManualGrant = { ...before, ...input, scopeDisplayName, updatedBy: actorEmail, updatedAt: new Date().toISOString() };
    grants = grants.map((grant) => grant.id === id ? after : grant); record("UPDATE", actorEmail, before, after); return after;
  },
  async deleteManualGrant(id: string, actorEmail) {
    const before = grants.find((grant) => grant.id === id);
    if (!before) return false;
    grants = grants.filter((grant) => grant.id !== id); record("DELETE", actorEmail, before, null); return true;
  },
};
