import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import DevLayout from "./layout";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("developer route authorization", () => {
  it.each(["/dev/ui", "/dev/overview"])("allows GLOBAL_ADMIN to render %s", async (path) => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    const page = createElement("div", { "data-route": path });
    await expect(DevLayout({ children: page })).resolves.toBe(page);
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["GLOBAL_USER", "global.user@example.test"],
    ["scoped user", "area.manual@example.test"],
    ["no-access user", "unknown@example.test"],
  ])("denies %s direct access to dev routes", async (_label, email) => {
    vi.stubEnv("EHS_MOCK_USER_EMAIL", email);
    const page = createElement("div", { "data-route": "/dev/ui" });
    await expect(DevLayout({ children: page })).rejects.toThrow("REDIRECT:/no-access");
    expect(redirect).toHaveBeenCalledWith("/no-access");
  });
});
