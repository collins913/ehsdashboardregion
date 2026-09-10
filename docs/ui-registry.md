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

## Shared

| Component | Responsibility |
| --- | --- |
| AppSidebar | Renders centralized navigation and active state |
| DashboardShell | Composes SidebarProvider, AppSidebar and page inset |
| PageHeader | Sidebar trigger, breadcrumb, title, description and optional actions |
| PageContainer | Shared content width, responsive page padding and vertical spacing |
| PlaceholderPage | Prevents duplicated temporary-page layout |
| GlobalFiltersPlaceholder | Reserves Region, Area, Store and Period controls without filtering logic |
| StatusDisplay | Maps normalized business statuses to centralized labels and semantic appearance |
| DataTableColumnHeader | Reusable sortable column header bound to table state |
| DataTableColumnVisibility | Reusable column visibility menu using existing Dropdown Menu primitives |

## Feature-specific

| Component | Responsibility |
| --- | --- |
| KpiDataTable | KPI V1 table prototype, including status/availability cells, abnormal filtering, pagination, sticky Store column and Action detail Sheet |

`src/hooks/use-mobile.ts` is an internal Sidebar dependency.
