"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { getDashboardRoute } from "@/config/navigation";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { KpiStore } from "@/data/contracts/kpi";
import type { Month } from "@/types/ehs";
import type { AccountSummary } from "@/data/contracts/access";
import { GlobalFilterProvider } from "@/features/global-filters/global-filter-provider";
import type { GlobalFilterState } from "@/features/global-filters/global-filter-state";
import { GLifeContextProvider } from "@/features/enterprise/glife-context-provider";

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
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const navigationRequested = useRef(false);
  useEffect(() => {
    if (!isNavigating) navigationRequested.current = false;
  }, [isNavigating]);
  const displayedPathname = isNavigating && pendingPathname ? pendingPathname : pathname;
  const route = getDashboardRoute(displayedPathname);
  function navigate(href: string) {
    if (href === pathname && !isNavigating && !navigationRequested.current) return;
    // Track the intent synchronously, including clicks before React renders pending state.
    navigationRequested.current = true;
    setPendingPathname(href);
    startNavigation(() => router.push(href));
  }
  return (
    <GLifeContextProvider>
      <SidebarProvider>
        <AppSidebar account={account} activePathname={displayedPathname} onNavigate={navigate} />
        <SidebarInset className="min-w-0">
          <GlobalFilterProvider userEmail={account?.email} stores={stores} initialState={initialFilterState} nowIso={nowIso} referenceMonth={referenceMonth}>
            {route && route.showDashboardHeader !== false ? (
              <PageHeader
                title={route.title}
                description={route.description}
                showGlobalFilters={route.showGlobalFilters}
                showPeriodFilter={route.showPeriodFilter}
                breadcrumbs={route.section
                  ? [{ label: route.section }, { label: route.title }]
                  : [{ label: route.title }]}
              />
            ) : null}
            {isNavigating ? (
              <PageContainer><AsyncQueryFeedback status="LOADING" /></PageContainer>
            ) : children}
          </GlobalFilterProvider>
        </SidebarInset>
      </SidebarProvider>
    </GLifeContextProvider>
  );
}
