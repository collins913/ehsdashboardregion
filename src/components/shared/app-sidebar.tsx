"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  EllipsisVertical,
  MessageSquare,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { applicationName, navigationGroups, navigationLabels, routes } from "@/config/navigation";
import type { AccountSummary } from "@/data/contracts/access";
import { useGLifeProfile } from "@/features/enterprise/glife-context-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export function AppSidebar({ account, activePathname, onNavigate }: {
  account?: AccountSummary;
  activePathname?: string;
  onNavigate?: (href: string) => void;
}) {
  const currentPathname = usePathname();
  const pathname = activePathname ?? currentPathname;
  const navigationHandler = (href: string): LinkProps["onNavigate"] => onNavigate ? (event) => {
    event.preventDefault();
    onNavigate(href);
  } : undefined;
  const { isMobile, setOpenMobile } = useSidebar();
  const incomingProfile = useGLifeProfile();
  const profile = incomingProfile?.email?.trim().toLowerCase() === account?.email.trim().toLowerCase()
    ? incomingProfile : null;
  const accountName = profile?.displayName || account?.displayName?.trim() || "未提供姓名";
  const accountEmail = profile?.email || account?.email || "";
  const avatarUrl = profile?.avatarUrl || account?.avatarUrl;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link
          href={routes.overview.href}
          onNavigate={navigationHandler(routes.overview.href)}
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
                          onNavigate={navigationHandler(item.href)}
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
            {[routes.accessManagement].map((item) => {
              const isActive = pathname.startsWith(item.href);
              return <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.href} onNavigate={navigationHandler(item.href)} onClick={() => setOpenMobile(false)}><item.icon aria-hidden="true" /><span>{item.title}</span></Link>
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
                  <SidebarMenuButton size="lg" tooltip={accountName} aria-label={`${accountName}，用户菜单`}>
                    <Avatar>
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={accountName} referrerPolicy="no-referrer" /> : null}
                      <AvatarFallback>
                        <UserRound aria-hidden="true" className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-medium">{accountName}</span>
                      <span className="truncate text-xs text-muted-foreground">{account.summary}</span>
                    </div>
                    <EllipsisVertical aria-hidden="true" className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-56 max-w-[calc(100vw-2rem)]" side={isMobile ? "top" : "right"} align="end" sideOffset={4}>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm text-foreground">
                      <Avatar>
                        {avatarUrl ? <AvatarImage src={avatarUrl} alt={accountName} referrerPolicy="no-referrer" /> : null}
                        <AvatarFallback><UserRound aria-hidden="true" className="size-4" /></AvatarFallback>
                      </Avatar>
                      <div className="grid min-w-0 flex-1 leading-tight">
                        <span className="break-words font-medium">{accountName}</span>
                        <span className="break-all text-xs text-muted-foreground">{accountEmail}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {account.scopes.map((scope) => (
                    <DropdownMenuLabel key={scope} className="flex items-center gap-1.5 text-sm font-normal text-foreground">
                      <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 break-words">{scope}</span>
                    </DropdownMenuLabel>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { toast.info("提交建议功能暂未开放"); setOpenMobile(false); }}>
                    <MessageSquare aria-hidden="true" />提交建议
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={routes.help.href} onNavigate={navigationHandler(routes.help.href)} onClick={() => setOpenMobile(false)}>
                      <routes.help.icon aria-hidden="true" />{routes.help.title}
                    </Link>
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
