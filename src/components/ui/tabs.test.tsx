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
  it("preserves inactive unmounting and gives the active tab one shared indicator", () => {
    const text = markup(false);
    expect(text).toContain("matrix-content");
    expect(text).not.toContain("list-content");
    expect(text.match(/data-slot="tabs-active-indicator"/g)).toHaveLength(1);
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
    expect(text.match(/data-slot="tabs-active-indicator"/g)).toHaveLength(1);
    expect(text).toContain("motion-reduce:transition-none");
    expect(text).toContain("motion-reduce:filter-none!");
    expect(text).not.toContain("transition-transform duration-300");
  });
  it("preserves the asChild trigger contract", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { defaultValue: "custom" },
      createElement(TabsList, null, createElement(TabsTrigger, { value: "custom", asChild: true },
        createElement("a", { href: "#custom" }, "自定义触发器")))));
    expect(html).toContain('href="#custom"');
    expect(html).toContain('role="tab"');
    expect(html).toContain("自定义触发器");
    expect(html).toContain("data-active:bg-background");
    expect(html).not.toContain('data-slot="tabs-active-indicator"');
  });
  it.each(["matrix", "list"])("uses natural height and mounts only the selected %s panel in auto-height mode", (value) => {
    const html = renderToStaticMarkup(createElement(Tabs, { animated: true, value },
      createElement(TabsContents, { mode: "auto-height" },
        createElement(TabsContent, { value: "matrix" }, "matrix-content"),
        createElement(TabsContent, { value: "list" }, "list-content"))));
    expect(html).toContain(`${value}-content`);
    expect(html).not.toContain(`${value === "matrix" ? "list" : "matrix"}-content`);
    expect(html).toContain('data-mode="auto-height"');
    expect(html).not.toContain("absolute inset-0 h-full");
    expect(html).toContain('aria-hidden="false"');
    expect(html).not.toContain('inert=""');
  });

});
