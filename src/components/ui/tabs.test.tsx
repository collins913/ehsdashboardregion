import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsContents, TabsList, TabsTrigger } from "./tabs";

function markup(animated: boolean, value = "matrix") {
  return renderToStaticMarkup(createElement(Tabs, { animated, value },
    createElement(TabsList, null,
      createElement(TabsTrigger, { value: "matrix" }, "矩阵"),
      createElement(TabsTrigger, { value: "list" }, "明细")),
    createElement(TabsContents, { className: "min-h-60" },
      createElement(TabsContent, { value: "matrix" }, "matrix-content"),
      createElement(TabsContent, { value: "list" }, "list-content"))));
}

describe("optional animated Tabs", () => {
  it("preserves the default unmounted inactive content and has no sliding indicator", () => {
    const text = markup(false);
    expect(text).toContain("matrix-content");
    expect(text).not.toContain("list-content");
    expect(text).not.toContain('data-slot="tabs-active-indicator"');
  });

  it.each(["matrix", "list"])("keeps only %s accessible while both panes crossfade", (value) => {
    const text = markup(true, value);
    expect(text).toContain("matrix-content");
    expect(text).toContain("list-content");
    const panels = text.match(/<div\b[^>]*role="tabpanel"[^>]*>/g) ?? [];
    expect(panels).toHaveLength(2);
    const active = panels[value === "matrix" ? 0 : 1];
    const inactive = panels[value === "matrix" ? 1 : 0];
    expect(active).toContain('aria-hidden="false"');
    expect(active).not.toContain('inert=""');
    expect(inactive).toContain('aria-hidden="true"');
    expect(inactive).toContain('inert=""');
    expect(active).toContain("opacity:1");
    expect(active).toContain("blur(0px)");
    expect(inactive).toContain("opacity:0");
    expect(inactive).toContain("blur(2px)");
    expect(text).not.toContain("translateX(");
    expect(text).not.toContain('data-slot="tabs-active-indicator"');
    expect(text).toContain("motion-reduce:transition-none");
    expect(text).toContain("motion-reduce:filter-none!");
    expect(text).not.toContain("transition-transform duration-300");
  });
});
