import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { KpiStore } from "@/data/contracts/kpi";
import type { Month } from "@/types/ehs";
import { GlobalFilterProvider } from "@/features/global-filters/global-filter-provider";
import type { GlobalFilterState } from "@/features/global-filters/global-filter-state";

type DashboardShellProps = {
  children: ReactNode;
  stores: readonly KpiStore[];
  initialFilterState: GlobalFilterState;
  nowIso: string;
  referenceMonth: Month;
};

export function DashboardShell({
  children,
  stores,
  initialFilterState,
  nowIso,
  referenceMonth,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <GlobalFilterProvider
          stores={stores}
          initialState={initialFilterState}
          nowIso={nowIso}
          referenceMonth={referenceMonth}
        >
          {children}
        </GlobalFilterProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
