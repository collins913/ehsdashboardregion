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
| Table | `src/components/ui/table.tsx` | KPI, Actions, Events, Take Charge and Stores Data Tables plus detail tables |
| Badge | `src/components/ui/badge.tsx` | Shared status and data-availability display |
| Avatar | `src/components/ui/avatar.tsx` | UI Lab reference |
| Skeleton | `src/components/ui/skeleton.tsx` | Sidebar dependency, UI Lab |
| Sheet | `src/components/ui/sheet.tsx` | Mobile Sidebar dependency plus KPI, Actions, Events, Take Charge and Store detail |
| Select | `src/components/ui/select.tsx` | Global Region, Area and natural-month Period controls |
| Popover | `src/components/ui/popover.tsx` | MonthPicker floating panel |
| Command | `src/components/ui/command.tsx` | Searchable Store multi-select list |
| Card | `src/components/ui/card.tsx` | Goals summary metrics |

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
| DataAvailabilityDisplay | Centralized DataAvailability badge and explanation used by KPI and Goals |
| AsyncQueryFeedback | Reuses Skeleton and DataAvailabilityDisplay for shared loading and query-failure feedback |
| TableCellTrigger | Provides compact native-button interaction, focus, pressed and a shared named group for clickable table content |
| DataTableColumnHeader | Reusable sortable column header bound to table state |
| DataTableColumnVisibility | Reusable column visibility menu using existing Dropdown Menu primitives |
| DataTablePlaceholderRows | Preserves adaptive table body height and visible column geometry while async data is loading or unavailable |
| DataTable layout helpers | Shared fixed table layout, minimum width, horizontal overflow, sticky mechanics and `primary` / `content` / `standard` / `compact` sizing roles; Features explicitly assign roles |

## Shared utilities

| Utility | Responsibility |
| --- | --- |
| Business date/time formatter | Formats normalized timezone-aware timestamps as Asia/Shanghai `YYYY-MM-DD` or `YYYY-MM-DD HH:mm` for Take Charge, Actions and Events |

## Shared hooks

| Hook | Responsibility |
| --- | --- |
| useAdaptiveTablePageSize | Measures viewport space, actual row and pagination dimensions, then reports only the 5 / 7 / 10 page-size bucket; it owns no pagination state |
| useLatestAsyncQuery | Provides IDLE / LOADING / SUCCESS / ERROR state and prevents stale async responses from replacing the latest query |

## Feature-specific

| Component | Responsibility |
| --- | --- |
| KpiDataTable | KPI V1 table, including status/availability cells, abnormal filtering, single-state adaptive 5 / 7 / 10 pagination, sticky Store column and Action detail Sheet |
| KpiPageContent | Sends shared Global Filter Context through the injected server query boundary and renders KpiDataTable |
| ActionsDataTable | Actions record table with view switching, sorting, column visibility, adaptive pagination, row drill-down and Action Detail Sheet |
| ActionsPageContent | Connects shared Global Filter Context and Actions view mode to the injected server query boundary |
| ActionStatusDisplay | Actions feature adapter that maps centralized workflow presentation into shared StatusDisplay for tables and details |
| EventsDataTable | Events table with view mode, dynamic Event Type filter, column visibility, adaptive pagination and row detail Sheet |
| EventsPageContent | Connects shared Global Filter Context and feature-local filters to the injected server query boundary |
| GoalsPageContent | Connects Global Filter Context to injected async Take Charge summary and record queries; metric cards use consistent plain-text values |
| TakeChargeDataTable | Repository-paginated Take Charge records with Current Open / All view mode, repository-side sorting, dynamic hidden fields, adaptive page size and row detail Sheet |
| StoresDataTable | Store Master browser with sortable confirmed fields, column visibility, adaptive pagination, sticky Store column and Store Detail Sheet |
| StoresPageContent | Connects shared Global Filter Context to the injected async Stores query; Period is ignored by the Repository |

`src/hooks/use-mobile.ts` is an internal Sidebar dependency.
