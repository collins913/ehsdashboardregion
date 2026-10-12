import { describe, expect, it } from "vitest";
import { helpSections, searchHelpSections } from "./help-content";

describe("help catalog search", () => {
  it("finds Chinese explanations and technical field aliases", () => {
    expect(searchHelpSections("到期日期").map((section) => section.id)).toContain("certificates");
    expect(searchHelpSections("  TrTiD  ").map((section) => section.id)).toContain("stores");
    expect(searchHelpSections("关闭率 KPI").map((section) => section.id)).toContain("actions");
  });
  it("returns the catalog for empty input and no results for an unknown term", () => {
    expect(searchHelpSections("  ")).toBe(helpSections);
    expect(searchHelpSections("不存在的字段987654")).toEqual([]);
  });
  it("has unique anchor IDs and field labels", () => {
    expect(new Set(helpSections.map((section) => section.id)).size).toBe(helpSections.length);
    for (const section of helpSections) {
      expect(new Set(section.fields.map(([name]) => name)).size).toBe(section.fields.length);
    }
  });
});
