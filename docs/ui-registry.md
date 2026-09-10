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
| Avatar | `src/components/ui/avatar.tsx` | UI Lab reference |
| Skeleton | `src/components/ui/skeleton.tsx` | Sidebar dependency, UI Lab |
| Sheet | `src/components/ui/sheet.tsx` | Internal mobile Sidebar dependency only |

## Shared

| Component | Responsibility |
| --- | --- |
| AppSidebar | Renders centralized navigation and active state |
| DashboardShell | Composes SidebarProvider, AppSidebar and page inset |
| PageHeader | Sidebar trigger, breadcrumb, title, description and optional actions |
| PageContainer | Shared content width, responsive page padding and vertical spacing |
| PlaceholderPage | Prevents duplicated temporary-page layout |
| GlobalFiltersPlaceholder | Reserves Region, Area, Store and Period controls without filtering logic |

`src/hooks/use-mobile.ts` is an internal Sidebar dependency.
