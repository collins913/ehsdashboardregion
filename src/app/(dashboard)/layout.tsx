import type { ReactNode } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { createInitialGlobalFilterState } from "@/features/global-filters/global-filter-state";
import { shanghaiYearMonth } from "@/data/contracts/kpi-period";
import type { Month } from "@/types/ehs";
import { redirect } from "next/navigation";
import { getAccountSummary, getAuthorizedFilterStores } from "@/lib/access/access-service.server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const referenceDate = new Date();
  const { year, month } = shanghaiYearMonth(referenceDate);
  const referenceMonth = `${year}-${String(month).padStart(2, "0")}` as Month;
  const account = await getAccountSummary();
  if (account.scopes.length === 0) redirect("/no-access");

  return (
    <DashboardShell
      stores={await getAuthorizedFilterStores()}
      account={account}
      initialFilterState={createInitialGlobalFilterState()}
      nowIso={referenceDate.toISOString()}
      referenceMonth={referenceMonth}
    >
      {children}
    </DashboardShell>
  );
}
