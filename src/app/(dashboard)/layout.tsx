import type { ReactNode } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { ehsRepository } from "@/data/repositories";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      stores={ehsRepository.listFilterStores()}
      initialFilterState={createInitialGlobalFilterState()}
      nowIso={new Date().toISOString()}
    >
      {children}
    </DashboardShell>
  );
}
