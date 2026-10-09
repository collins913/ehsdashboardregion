import type { ProductionAccessPrincipal } from "./production-import";

export interface ServerIdentityProvider {
  getVerifiedPrincipal(): Promise<ProductionAccessPrincipal | null>;
}

export interface MachineIdentityProvider {
  authenticate(request: Request): Promise<import("./production-import").MachinePrincipal | null>;
}
