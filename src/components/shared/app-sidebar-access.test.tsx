import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AccountSummary } from "@/data/contracts/access";
import { systemManagementNavigation } from "@/config/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dev/data-logic" }));

function markup(canManageAccess: boolean, scopes = ["测试范围"]) {
  const account: AccountSummary = {
    email: "test@example.test", displayName: null, avatarUrl: null,
    summary: "测试用户", scopes, canManageAccess,
  };
  return renderToStaticMarkup(createElement(TooltipProvider, null, createElement(SidebarProvider, null, createElement(AppSidebar, { account }))));
}

describe("system management navigation visibility", () => {
  it("shows all system routes for the administrator capability", () => {
    const html = markup(true);
    expect(html).toContain("系统管理");
    for (const item of systemManagementNavigation.items) expect(html).toContain(`href="${item.href}"`);
    expect(html.match(/<a\b[^>]*href="\/dev\/data-logic"[^>]*>/)?.[0]).toContain('aria-current="page"');
  });
  it("shows only data logic without the administrator capability", () => {
    const html = markup(false);
    expect(html).toContain("系统管理");
    expect(html).toContain('href="/dev/data-logic"');
    expect(html).not.toContain('href="/dev/ui"');
    expect(html).not.toContain('href="/access"');
  });
  it("hides every system entry for an account without access", () => {
    const html = markup(false, []);
    expect(html).not.toContain("系统管理");
    for (const item of systemManagementNavigation.items) expect(html).not.toContain(`href="${item.href}"`);
  });
});
