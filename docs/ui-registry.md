# UI Registry

## shadcn/ui

| Component | File | Current use |
| --- | --- | --- |
| Button | `src/components/ui/button.tsx` | Actions, triggers, UI Lab |
| Breadcrumb | `src/components/ui/breadcrumb.tsx` | PageHeader, UI Lab |
| Sidebar | `src/components/ui/sidebar.tsx` | Application navigation shell |
| Separator | `src/components/ui/separator.tsx` | PageHeader, Sidebar dependency, UI Lab |
| Tooltip | `src/components/ui/tooltip.tsx` | Collapsed Sidebar labels |
| Dropdown Menu | `src/components/ui/dropdown-menu.tsx` | UI Lab reference |
| Table | `src/components/ui/table.tsx` | KPI Data Table and Action detail tables |
| Badge | `src/components/ui/badge.tsx` | Shared status and data-availability display |
| Avatar | `src/components/ui/avatar.tsx` | UI Lab reference |
| Skeleton | `src/components/ui/skeleton.tsx` | Sidebar dependency, UI Lab |
| Sheet | `src/components/ui/sheet.tsx` | Mobile Sidebar dependency and KPI Action detail |
| Select | `src/components/ui/select.tsx` | Global Region, Area and natural-month Period controls |
| Popover | `src/components/ui/popover.tsx` | MonthPicker floating panel |
| Command | `src/components/ui/command.tsx` | Searchable Store multi-select list |

## Shared

| Component | Responsibility |
| --- | --- |
| AppSidebar | Renders centralized navigation and active state |
| DashboardShell | Composes SidebarProvider, AppSidebar, page inset and persistent Global Filter Provider |
| ThemeProvider | Applies the global Light, Dark or System theme through `next-themes` |
| ThemeToggle | Shared Chinese theme selector for Dashboard headers and UI Lab |
| PageHeader | Sidebar trigger, breadcrumb, title, description and optional actions |
| PageContainer | Shared content width, responsive page padding and vertical spacing |
| PlaceholderPage | Prevents duplicated temporary-page layout |
| GlobalFilters | Renders the full-width compact filter bar with Region, Area, searchable canonical Store multi-select and natural-month Period controls |
| MonthPicker | Selects one `YYYY-MM` value using Button, Popover and Select without date-level input |
| OverflowTooltip | Truncates single-line text and enables Tooltip only when DOM overflow is present |
| StatusDisplay | Maps normalized business statuses to centralized labels and semantic appearance; supports custom value labels, optional icons and opt-in interactive hover |
| TableCellTrigger | Provides compact native-button interaction, focus, pressed and a shared named group for clickable table content |
| DataTableColumnHeader | Reusable sortable column header bound to table state |
| DataTableColumnVisibility | Reusable column visibility menu using existing Dropdown Menu primitives |

## Shared hooks

| Hook | Responsibility |
| --- | --- |
| useAdaptiveTablePageSize | Measures viewport space, actual row and pagination dimensions, then reports only the 5 / 7 / 10 page-size bucket; it owns no pagination state |

## Feature-specific

| Component | Responsibility |
| --- | --- |
| KpiDataTable | KPI V1 table, including status/availability cells, abnormal filtering, single-state adaptive 5 / 7 / 10 pagination, sticky Store column and Action detail Sheet |
| KpiPageContent | Connects shared Global Filter Context to the Repository, KPI builder and KpiDataTable |

`src/hooks/use-mobile.ts` is an internal Sidebar dependency.
