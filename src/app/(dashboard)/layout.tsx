import type { ReactNode } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { createEhsRepository } from "@/data/repositories/create-ehs-repository.server";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";
import { shanghaiYearMonth } from "@/data/contracts/kpi-period";
import type { Month } from "@/types/ehs";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const referenceDate = new Date();
  const { year, month } = shanghaiYearMonth(referenceDate);
  const referenceMonth = `${year}-${String(month).padStart(2, "0")}` as Month;
  const repository = createEhsRepository(referenceDate);

  return (
    <DashboardShell
      stores={await repository.getFilterStores()}
      initialFilterState={createInitialGlobalFilterState()}
      nowIso={referenceDate.toISOString()}
      referenceMonth={referenceMonth}
    >
      {children}
    </DashboardShell>
  );
}
