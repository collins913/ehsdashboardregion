"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function SidebarStateDemo() {
  const { state } = useSidebar();

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <SidebarTrigger />
      <span>
        Current state: <strong className="font-medium">{state}</strong>
      </span>
      <span className="text-muted-foreground">Toggle to inspect both states.</span>
    </div>
  );
}
