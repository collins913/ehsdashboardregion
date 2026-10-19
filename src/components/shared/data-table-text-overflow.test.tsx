import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

const row = { id: "admin", name: "Waner Shangguan（上官婉儿）", email: "a-very-long-email-address@example.test" };
const columns: DataTableColumn<typeof row>[] = [
  { id: "name", title: "姓名", value: (item) => item.name, sizeRole: "standard" },
  { id: "email", title: "邮箱", value: (item) => item.email, sizeRole: "primary" },
  { id: "action", title: "操作", value: () => "", sizeRole: "compact", render: () => createElement("button", null, "编辑") },
];

describe("DataTable text column boundaries", () => {
  it("contains long name and email text in separate truncating wrappers and preserves custom actions", () => {
    const html = renderToStaticMarkup(createElement(DataTable<typeof row>, {
      rows: [row], columns, emptyMessage: "没有记录",
      interactionState: { sorting: [], pagination: { pageIndex: 0, pageSize: 5 } },
    }));
    const cells = html.match(/<td\b[^>]*>[\s\S]*?<\/td>/g) ?? [];
    expect(cells).toHaveLength(3);
    expect(cells[0]).toContain(row.name);
    expect(cells[0]).toContain("truncate");
    expect(cells[0]).toContain("w-full max-w-44");
    expect(cells[0]).not.toContain(row.email);
    expect(cells[1]).toContain(row.email);
    expect(cells[1]).toContain("truncate");
    expect(cells[1]).toContain("w-full max-w-96");
    expect(cells[2]).toContain("<button>编辑</button>");
  });
});
