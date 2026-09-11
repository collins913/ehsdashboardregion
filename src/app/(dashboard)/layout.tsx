import type { ReactNode } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { createEhsRepository } from "@/data/repositories";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const referenceDate = new Date();
  const repository = createEhsRepository(referenceDate);

  return (
    <DashboardShell
      stores={repository.listFilterStores()}
      initialFilterState={createInitialGlobalFilterState()}
      nowIso={referenceDate.toISOString()}
    >
      {children}
    </DashboardShell>
  );
}
