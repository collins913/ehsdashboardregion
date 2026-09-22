"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "lucide-react";
import { applicationName, navigationGroups, routes } from "@/config/navigation";
import type { AccountSummary } from "@/data/contracts/access";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ account }: { account?: AccountSummary }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link
          href={routes.overview.href}
          className="flex h-10 items-center gap-2 overflow-hidden rounded-md px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <House className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {applicationName}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label ?? group.items[0].href}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="data-active:bg-background data-active:shadow-xs"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {account?.canManageAccess ? (
        <SidebarGroup>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith(routes.accessManagement.href)} tooltip={routes.accessManagement.title}>
              <Link href={routes.accessManagement.href} onClick={() => setOpenMobile(false)}><routes.accessManagement.icon aria-hidden="true" /><span>{routes.accessManagement.title}</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      ) : null}
      {account ? <SidebarFooter className="border-t p-2">
        <Popover><PopoverTrigger asChild>
          <Button variant="ghost" className="h-auto w-full flex-col items-start gap-0 overflow-hidden px-2 py-2 text-left group-data-[collapsible=icon]:hidden">
            <span className="w-full truncate text-xs">{account.email}</span>
            <span className="w-full truncate text-xs text-muted-foreground">{account.summary}</span>
          </Button>
        </PopoverTrigger><PopoverContent side="right" align="end" className="space-y-3 text-sm">
          <div><div className="text-xs text-muted-foreground">账号</div><div className="break-all">{account.email}</div></div>
          <div><div className="text-xs text-muted-foreground">权限</div>{account.scopes.length ? account.scopes.map((scope) => <div key={scope}>{scope}</div>) : <div>暂无访问权限</div>}</div>
          {account.canManageAccess ? <Link className="text-primary underline" href={routes.accessManagement.href}>权限管理</Link> : null}
        </PopoverContent></Popover>
      </SidebarFooter> : null}
      <SidebarRail />
    </Sidebar>
  );
}
