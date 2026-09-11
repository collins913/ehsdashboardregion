"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function SidebarStateDemo() {
  const { state } = useSidebar();
  const stateLabel = state === "expanded" ? "展开" : "收起";

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <SidebarTrigger />
      <span>
        当前状态：<strong className="font-medium">{stateLabel}</strong>
      </span>
      <span className="text-muted-foreground">切换查看两种状态。</span>
    </div>
  );
}
