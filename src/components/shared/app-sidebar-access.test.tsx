import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountSummary } from "@/data/contracts/access";
import { systemManagementNavigation } from "@/config/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AvatarImage } from "@/components/ui/avatar";
import { useGLifeProfile } from "@/features/enterprise/glife-context-provider";
import { parseGLifeContextMessage } from "@/features/enterprise/glife-context";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dev/data-logic" }));

vi.mock("@/features/enterprise/glife-context-provider", () => ({ useGLifeProfile: vi.fn(() => null) }));
vi.mock("@/components/ui/avatar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/avatar")>();
  return { ...actual, AvatarImage: vi.fn(actual.AvatarImage) };
});
afterEach(() => { vi.mocked(useGLifeProfile).mockReturnValue(null); vi.clearAllMocks(); });

function markup(canManageAccess: boolean, scopes = ["测试范围"], profile: Partial<AccountSummary> = {}) {
  const account: AccountSummary = {
    email: "test@example.test", displayName: null, avatarUrl: null,
    summary: "测试用户", scopes, canManageAccess, ...profile,
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


describe("sidebar profile fallback", () => {
  it("keeps a missing name explicit and uses the shared person fallback", () => {
    const html = markup(false);
    expect(html).toContain("未提供姓名");
    expect(html).toContain('data-slot="avatar-fallback"');
    expect(AvatarImage).not.toHaveBeenCalled();
  });
  it("uses server fields when matching embedded fields are missing", () => {
    vi.mocked(useGLifeProfile).mockReturnValue(parseGLifeContextMessage({ type: "GLIFE_CONTEXT", payload: { email: "test@example.test" } }));
    const html = markup(false, undefined, { displayName: "Waner Shangguan（上官婉儿）", avatarUrl: "https://example.test/avatar.png" });
    expect(html).toContain("Waner Shangguan（上官婉儿）");
    expect(vi.mocked(AvatarImage).mock.calls[0][0].src).toBe("https://example.test/avatar.png");
    expect(html).not.toContain('href="/access"');
  });
  it("ignores another account's embedded name and avatar", () => {
    vi.mocked(useGLifeProfile).mockReturnValue(parseGLifeContextMessage({ type: "GLIFE_CONTEXT", payload: { email: "other@example.test", name: "Other user", avatarUrl: "https://example.test/other.png" } }));
    const html = markup(false);
    expect(html).toContain("未提供姓名");
    expect(html).not.toContain("Other user");
    expect(AvatarImage).not.toHaveBeenCalled();
    expect(html).not.toContain('href="/access"');
  });
});
