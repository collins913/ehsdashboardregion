"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getDashboardRoute } from "@/config/navigation";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { KpiStore } from "@/data/contracts/kpi";
import type { Month } from "@/types/ehs";
import type { AccountSummary } from "@/data/contracts/access";
import { GlobalFilterProvider } from "@/features/global-filters/global-filter-provider";
import type { GlobalFilterState } from "@/features/global-filters/global-filter-state";

type DashboardShellProps = {
  children: ReactNode;
  stores: readonly KpiStore[];
  initialFilterState: GlobalFilterState;
  nowIso: string;
  referenceMonth: Month;
  account?: AccountSummary;
};

export function DashboardShell({
  children,
  stores,
  initialFilterState,
  nowIso,
  referenceMonth,
  account,
}: DashboardShellProps) {
  const route = getDashboardRoute(usePathname());
  return (
    <SidebarProvider>
      <AppSidebar account={account} />
      <SidebarInset className="min-w-0">
        <GlobalFilterProvider
          stores={stores}
          initialState={initialFilterState}
          nowIso={nowIso}
          referenceMonth={referenceMonth}
        >
          {route && route.showDashboardHeader !== false ? (
            <PageHeader
              title={route.title}
              description={route.description}
              breadcrumbs={route.section
                ? [{ label: route.section }, { label: route.title }]
                : [{ label: route.title }]}
            />
          ) : null}
          {children}
        </GlobalFilterProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
