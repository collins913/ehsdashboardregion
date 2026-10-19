import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); }, forbidden: () => { throw new Error("FORBIDDEN"); } }));
vi.mock("@/components/shared/dashboard-shell", () => ({ DashboardShell: () => null }));
vi.mock("@/features/access-management/access-management-page", () => ({ AccessManagementPage: () => null }));
import AccessPage from "@/app/(dashboard)/access/page";
import DashboardLayout from "@/app/(dashboard)/layout";
import DataLogicPage from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("data logic reference access and defaults", () => {
  it.each(["admin@example.test", "global.user@example.test", "area.manual@example.test", "manager.1@example.test"])("allows authorized account %s through the dashboard boundary", async (email) => {
    vi.stubEnv("EHS_MOCK_PROFILE", "standard");
    vi.stubEnv("EHS_MOCK_USER_EMAIL", email);
    await expect(DashboardLayout({ children: createElement(DataLogicPage) })).resolves.toBeDefined();
  });
  it.each(["global.user@example.test", "area.manual@example.test", "manager.1@example.test", "unknown@example.test"])("denies direct access to access management for %s", async (email) => {
    vi.stubEnv("EHS_MOCK_PROFILE", "standard");
    vi.stubEnv("EHS_MOCK_USER_EMAIL", email);
    await expect(AccessPage()).rejects.toThrow("FORBIDDEN");
  });
  it("allows an administrator into access management", async () => {
    vi.stubEnv("EHS_MOCK_PROFILE", "standard");
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    await expect(AccessPage()).resolves.toBeDefined();
  });
  it("denies an account without access", async () => {
    vi.stubEnv("EHS_MOCK_PROFILE", "standard");
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "unknown@example.test");
    await expect(DashboardLayout({ children: createElement(DataLogicPage) })).rejects.toThrow("REDIRECT:/no-access");
  });
  it("starts every shared accordion item collapsed without a UI Lab link", () => {
    const html = renderToStaticMarkup(createElement(DataLogicPage));
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-expanded="true"');
    expect(html).not.toContain('href="/dev/ui"');
  });
});
