import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { StatusDisplay } from "@/components/shared/status-display";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";

describe("TableCellTrigger", () => {
  it("renders a compact native button with the shared named group", () => {
    const markup = renderToStaticMarkup(
      createElement(TableCellTrigger, null, "查看"),
    );

    expect(markup).toContain("<button");
    expect(markup).toContain('type="button"');
    expect(markup).toContain("group/table-cell-trigger");
    expect(markup).toContain("cursor-pointer");
    expect(markup).toContain('data-size="sm"');
    expect(markup).toContain('data-variant="link"');
    expect(markup).toContain("hover:underline");
    expect(markup).not.toContain("hover:bg-muted");
  });

  it("only underlines text triggers without a badge, retaining badge darkening", () => {
    const markup = renderToStaticMarkup(
      createElement(TableCellTrigger, null,
        createElement(StatusDisplay, { status: "NOT_ACHIEVED", interactive: true }),
      ),
    );
    const triggerClasses = markup.match(/<button[^>]*class="([^"]*)"/)?.[1].split(" ") ?? [];
    expect(triggerClasses).not.toContain("hover:underline");
    expect(triggerClasses).toContain("hover:no-underline");
    expect(triggerClasses).toContain("not-has-data-[ui-badge]:hover:underline");
    expect(markup).toContain('data-slot="badge"');
    expect(markup).toContain("group-hover/table-cell-trigger:bg-muted");
  });

  it("recognizes the availability badge through a Tooltip asChild trigger", () => {
    const markup = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(TableCellTrigger, null,
        createElement(DataAvailabilityDisplay, { availability: "INCOMPLETE" }),
      ),
    ));
    // Tooltip asChild replaces data-slot; the badge identity must survive independently.
    expect(markup).toContain('data-slot="tooltip-trigger"');
    expect(markup).not.toContain('data-slot="badge"');
    expect(markup).toContain('data-ui-badge=""');
    expect(markup).toContain("not-has-data-[ui-badge]:hover:underline");
    expect(markup).toContain("group-hover/table-cell-trigger:bg-muted");
  });

  it.each(["outline", "secondary", "destructive"] as const)(
    "retains %s badge identity through Tooltip and Badge asChild composition",
    (variant) => {
      const markup = renderToStaticMarkup(createElement(TooltipProvider, null,
        createElement(TableCellTrigger, null,
          createElement(Tooltip, null,
            createElement(TooltipTrigger, { asChild: true },
              createElement(Badge, { asChild: true, variant }, createElement("span", null, "测试标签")),
            ),
          ),
        ),
      ));
      expect(markup).toContain('data-slot="tooltip-trigger"');
      expect(markup).not.toContain('data-slot="badge"');
      expect(markup).toContain('data-ui-badge=""');
      const classes = markup.match(/<button[^>]*class="([^"]*)"/)?.[1].split(" ") ?? [];
      expect(classes).not.toContain("hover:underline");
      expect(classes).toContain("not-has-data-[ui-badge]:hover:underline");
      expect(classes).toContain("has-data-[ui-badge]:hover:bg-transparent");
    },
  );

  it.each(["ACHIEVED", "OPEN", "CLOSED", "ABNORMAL"] as const)(
    "preserves the interactive %s status darkening through a Tooltip wrapper",
    (status) => {
      const markup = renderToStaticMarkup(createElement(TooltipProvider, null,
        createElement(TableCellTrigger, null,
          createElement(Tooltip, null,
            createElement(TooltipTrigger, { asChild: true },
              createElement("span", null, createElement(StatusDisplay, { status, interactive: true })),
            ),
          ),
        ),
      ));
      expect(markup).toContain('data-ui-badge=""');
      expect(markup).toContain('data-slot="tooltip-trigger"');
      expect(markup).toContain("group-hover/table-cell-trigger:bg-muted");
      const classes = markup.match(/<button[^>]*class="([^"]*)"/)?.[1].split(" ") ?? [];
      expect(classes).not.toContain("hover:underline");
      expect(classes).toContain("not-has-data-[ui-badge]:hover:underline");
    },
  );

  it("does not misclassify Tooltip-wrapped plain availability text as a badge", () => {
    const markup = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(TableCellTrigger, null,
        createElement(DataAvailabilityDisplay, { availability: "INCOMPLETE", appearance: "text" }),
      ),
    ));
    expect(markup).toContain('data-slot="tooltip-trigger"');
    expect(markup).not.toContain('data-ui-badge');
    expect(markup).toContain("not-has-data-[ui-badge]:hover:underline");
  });

  it("preserves native disabled semantics", () => {
    const markup = renderToStaticMarkup(
      createElement(TableCellTrigger, { disabled: true }, "不可用"),
    );

    expect(markup).toContain('disabled=""');
  });
});
