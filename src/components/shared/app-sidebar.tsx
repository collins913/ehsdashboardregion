"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  EllipsisVertical,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { applicationName, navigationGroups, navigationLabels, routes } from "@/config/navigation";
import type { AccountSummary } from "@/data/contracts/access";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const { isMobile, setOpenMobile } = useSidebar();

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
          <SidebarGroupLabel>{navigationLabels.systemManagement}</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>
            {[routes.systemMonitoring, routes.accessManagement].map((item) => {
              const isActive = pathname.startsWith(item.href);
              return <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.href} onClick={() => setOpenMobile(false)}><item.icon aria-hidden="true" /><span>{item.title}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>;
            })}
          </SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      ) : null}
      {account ? (
        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={account.email} aria-label={account.email}>
                    <Avatar>
                      <AvatarFallback>
                        <UserRound aria-hidden="true" className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-medium">{account.email}</span>
                      <span className="truncate text-xs text-muted-foreground">{account.summary}</span>
                    </div>
                    <EllipsisVertical aria-hidden="true" className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={4}>
                  <DropdownMenuItem asChild>
                    <Link href={routes.help.href} onClick={() => setOpenMobile(false)}>
                      <routes.help.icon aria-hidden="true" />{routes.help.title}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { toast.info("反馈建议功能暂未开放"); setOpenMobile(false); }}>
                    <MessageSquare aria-hidden="true" />反馈建议
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </Sidebar>
  );
}
