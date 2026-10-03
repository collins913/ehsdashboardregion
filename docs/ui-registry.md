# UI Registry

## shadcn/ui

| Component | File | Current use |
| --- | --- | --- |
| Button | `src/components/ui/button.tsx` | Actions, triggers, UI Lab |
| Button Group | `src/components/ui/button-group.tsx` | Installed shadcn primitive; no current feature usage |
| Breadcrumb | `src/components/ui/breadcrumb.tsx` | PageHeader, UI Lab |
| Sidebar | `src/components/ui/sidebar.tsx` | Application navigation shell |
| Separator | `src/components/ui/separator.tsx` | PageHeader, Sidebar dependency, UI Lab |
| Tooltip | `src/components/ui/tooltip.tsx` | Collapsed Sidebar labels and shared OverflowTooltip |
| Hover Card | `src/components/ui/hover-card.tsx` | PageHeader route description on title hover or focus |
| Dropdown Menu | `src/components/ui/dropdown-menu.tsx` | AppSidebar account menu, UI Lab reference |
| Table | `src/components/ui/table.tsx` | KPI, Actions, Events, Take Charge, Stores, Environment and Certificates Data Tables plus detail tables |
| Badge | `src/components/ui/badge.tsx` | Shared status and data-availability display |
| Avatar | `src/components/ui/avatar.tsx` | AppSidebar account fallback, UI Lab reference |
| Skeleton | `src/components/ui/skeleton.tsx` | Sidebar dependency, UI Lab |
| Sheet | `src/components/ui/sheet.tsx` | Mobile Sidebar dependency plus existing domain details, including Environment, Certificates and Access Audit |
| Accordion | `src/components/ui/accordion.tsx` | Shared DetailAccordion primitive composition for Environment license sections and Certificates Type groups |
| Select | `src/components/ui/select.tsx` | Global Region, Area and natural-month Period controls; shared FilterSelect |
| Popover | `src/components/ui/popover.tsx` | MonthPicker floating panel and Global Store selector |
| Command | `src/components/ui/command.tsx` | Searchable Store multi-select list |
| Card | `src/components/ui/card.tsx` | AnalyticsMetricCard, DetailRecordCard and feature-composed Cards |
| Dialog | `src/components/ui/dialog.tsx` | Access Manual Grant create / edit |
| AlertDialog | `src/components/ui/alert-dialog.tsx` | Access Manual Grant delete confirmation |
| Tabs | `src/components/ui/tabs.tsx` | /access Manual Grants and Audit sections |
| Input | `src/components/ui/input.tsx` | Access email and grant form fields |
| Sonner | `src/components/ui/sonner.tsx` | Access mutation feedback |

## Shared

| Component | Responsibility |
| --- | --- |
| AppSidebar | Renders centralized navigation, active state and the account footer using shadcn SidebarMenu, Avatar and Dropdown Menu primitives |
| DashboardShell | Composes SidebarProvider, AppSidebar, page inset, persistent Global Filter Provider and PageHeader / GlobalFilters; header text reuses centralized navigation metadata, with UI Lab opting out |
| ThemeProvider | Applies the global Light, Dark or System theme through `next-themes` |
| ThemeToggle | Shared Chinese theme selector for Dashboard headers and UI Lab |
| PageHeader | Sidebar trigger, breadcrumb, title, optional actions and a focusable HoverCard description when route metadata provides one |
| PageContainer | Shared content width, responsive page padding and vertical spacing |
| DetailHeader | Accessible Sheet title/subtitle and optional caller-provided result/status display; body content must not repeat header information or invent a result; used by KPI, Actions, Events, Take Charge, Certificates, Environment, Stores and Access Audit details |
| DetailRecordCard | Neutral compact Card shell for one record in a collection; contract multiplicity, not the current result count, determines use. Used by Certificates, KPI Training/Drill/Inspection/ASTM and embedded Action collections, plus Environment waste-contract collections. Singleton contracts render without a Card; one record has at most one primary shell. |
| DetailAccordion / DetailAccordionItem | Business-neutral shadcn Accordion presentation; caller supplies title, optional count, disabled state, attention dot and default-open values. Count Badge is neutral and excluded from title hover underline. Used by Certificates and Environment; feature choices such as default-open groups are not global behavior. |
| DetailField | Shared label/value spacing, typography and wrapping only; does not format dates, infer status or calculate business values. Used by KPI, Actions, Events, Take Charge, Stores and Environment detail fields |
| PlaceholderPage | Prevents duplicated temporary-page layout |
| GlobalFilters | One persistent shared compact filter bar; Select and Store Button share trigger presentation, while Store retains Popover + Command canonical multi-select |
| MonthPicker | Selects one `YYYY-MM` value using Button, Popover and Select without date-level input |
| OverflowTooltip | Truncates single-line text and enables Tooltip only when DOM overflow is present |
| StatusDisplay | Maps normalized business statuses to centralized labels and semantic appearance; supports custom value labels, optional icons and opt-in interactive hover |
| FilterSelect | Shared low-cardinality mutually exclusive filter control built on shadcn Select; Features supply values and labels |
| DataAvailabilityDisplay | Centralized DataAvailability badge and explanation used by KPI and Goals |
| AsyncQueryFeedback | Reuses Skeleton and DataAvailabilityDisplay for shared loading and query-failure feedback |
| Chart | `src/components/ui/chart.tsx` provides the shadcn chart container, tooltip and color configuration primitives used by shared Analytics charts |
| AnalyticsClosureRadial | Business-neutral stacked radial chart presentation; callers provide two precomputed segments, rate, labels and title |
| AnalyticsCountTrend | Business-neutral monthly count area chart presentation; callers provide precomputed monthly rows and optional toolbar; one stable AreaChart receives latest rows directly and gates native Recharts animation through the shared reduced-motion hook |
| AnalyticsMetricCard | Single presentation for numeric Dashboard summary cards: title, optional inline Info HoverCard, description, animated value, and a shared natural-height, spacing and typography contract. Used by Goals, Environment and UI Lab. Features provide business content and Grid composition; the component does not own grids, calculations, queries or status evaluation. |
| AnalyticsRefreshIndicator | Compact group-level updating status for stale Analytics results; positioned without changing layout and accepts only a refreshing flag |
| Analytics layout | `src/components/shared/analytics-layout.ts` owns the shared 17.125rem Card height, 24px page section spacing, 325ms number timing and 375ms chart timing |
| AnimatedNumber | Interpolates already-computed display values in 325ms; respects `prefers-reduced-motion` |
| TableCellTrigger | Provides compact native-button interaction, focus, pressed and a shared named group for clickable table content |
| DataTableColumnHeader | Reusable sortable column header bound to table state |
| DataTable | Shared TanStack row rendering, header sorting, adaptive 5 / 7 / 10 pagination, loading and empty shell for Access lists; Features provide columns, rows and column size roles |
| DataTableColumnVisibility | Reusable column visibility menu using existing Dropdown Menu primitives |
| DataTablePlaceholderRows | Preserves adaptive table body height and visible column geometry while async data is loading or unavailable |
| DataTable loading helpers | Retain resolved rows and metadata; repository page/sort pending preserves visible inert content with fixed-width footer feedback, semantic scope pending masks content and only unknown footer digits |
| DataTable layout helpers | Shared body row geometry, fixed table layout, minimum width, horizontal overflow, sticky hover/selected state and `primary` / `content` / `standard` / `compact` sizing roles; Features explicitly assign roles |

## Shared utilities

| Utility | Responsibility |
| --- | --- |
| Business date/time formatter | Formats normalized timezone-aware timestamps as Asia/Shanghai `YYYY-MM-DD` or `YYYY-MM-DD HH:mm` for Take Charge, Actions and Events |
| Business Period formatter (`src/lib/format-business-period.ts`) | Formats a validated natural-month `KpiPeriod` for KPI, KPI Detail and the Period-based Goals cards; annual YTD subtitles retain their distinct year meaning |
| Analytics palette (`src/app/globals.css`) | Defines theme-aware `--analytics-*` colors for shared charts and the Events type distribution; preserves the accepted Light palette and provides readable Dark values |

## Shared hooks

| Hook | Responsibility |
| --- | --- |
| useAdaptiveTablePageSize | Measures viewport space, actual row and pagination dimensions, then reports only the 5 / 7 / 10 page-size bucket; it owns no pagination state |
| useLatestAsyncQuery | Provides IDLE / LOADING / SUCCESS / ERROR with the last successful resolved result and guarded imperative reload; prevents stale async responses from replacing the latest query |
| `useAnalyticsChartAnimationEnabled` (`src/components/shared/use-analytics-motion.ts`) | Disables initial chart tweening and gates 375ms Recharts data transitions when `prefers-reduced-motion` is enabled |

## Feature-specific

| Component | Responsibility |
| --- | --- |
| KpiDataTable | KPI V1 table, including status/availability cells, abnormal filtering, single-state adaptive 5 / 7 / 10 pagination, sticky Store column and Action detail Sheet |
| KpiPageContent | Sends shared Global Filter Context through the injected server query boundary and renders KpiDataTable |
| ActionsDataTable | Actions record table with view switching, sorting, column visibility, adaptive pagination, row drill-down and Action Detail Sheet |
| ActionsAnalytics | Requests Actions-owned analytics from Global Filter Context only and supplies precomputed results to shared chart presentation |
| ActionsPageContent | Connects shared Global Filter Context, Actions Analytics and table view mode to their injected server query boundaries |
| ActionStatusDisplay | Actions feature adapter that maps centralized workflow presentation into shared StatusDisplay for tables and details |
| EventsDataTable | Events table with view mode, dynamic Event Type filter, column visibility, adaptive pagination and row detail Sheet |
| EventsPageContent | Connects shared Global Filter Context and feature-local filters to the injected server query boundary |
| CertificatesDataTable | Certificates table and category detail Sheet; formal Type groups use collapsed shadcn Accordion items with neutral counts, disabled empty groups and a destructive dot for evaluated abnormal records |
| GoalsPageContent | Connects Global Filter Context to injected async Take Charge summary and record queries; four metric cards reuse AnalyticsMetricCard and retain the latest resolved summary during refresh |
| TakeChargeDataTable | Repository-paginated Take Charge records with All / Open Only view mode (defaults to All), repository-side sorting, dynamic hidden fields, adaptive page size and row detail Sheet |
| StoresDataTable | Store Master browser with sortable confirmed fields, column visibility, adaptive pagination, sticky Store column and Store Detail Sheet |
| StoresPageContent | Connects shared canonical Store scope to the injected async Stores query; Period does not affect query readiness or identity |

`src/hooks/use-mobile.ts` is an internal Sidebar dependency.
