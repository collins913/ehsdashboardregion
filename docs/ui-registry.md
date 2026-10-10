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
| Switch | `src/components/ui/switch.tsx` | System Monitoring Detail Sheet 未处理 / 已处理 toggle |

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
| DetailAccordion / DetailAccordionItem | Business-neutral shadcn Accordion presentation; caller supplies title, optional summary slot, count, disabled state, attention dot and default-open values. Count Badge is neutral and excluded from title hover underline. Used by Certificates, Environment and Overview score details; summary values and feature choices such as default-open groups are owned by callers. |
| DetailField | Shared label/value spacing, typography and wrapping only; does not format dates, infer status or calculate business values. Used by KPI, Actions, Events, Take Charge, Stores and Environment detail fields |
| GlobalFilters | One persistent shared compact filter bar; route metadata opts Period visibility per page. Select and Store Button share trigger presentation, while Store retains Popover + Command canonical multi-select |
| MonthPicker | Selects one `YYYY-MM` value using Button, Popover and Select without date-level input |
| OverflowTooltip | Truncates single-line text and enables Tooltip only when DOM overflow is present. Optional `renderTrigger(label)` composes the actual focusable trigger; its measured text adds no Tab stop, and the trigger remains mounted when overflow changes. Overview ranking and store links use this contract. |
| StatusDisplay | Maps normalized business statuses to centralized labels and semantic appearance; supports custom value labels, optional icons and opt-in interactive hover |
| FilterSelect | Shared low-cardinality mutually exclusive filter control built on shadcn Select; Features supply values and labels |
| DataAvailabilityDisplay | Centralized DataAvailability badge and explanation used by KPI and Goals |
| DataAvailabilityNotice | Shared table-level notice for normalized `INCOMPLETE` / `UNAVAILABLE` results; callers provide the domain subject only |
| AsyncQueryFeedback | Reuses Skeleton and DataAvailabilityDisplay for shared loading and query-failure feedback |
| Chart | `src/components/ui/chart.tsx` provides the shadcn chart container, tooltip and color configuration primitives used by shared Analytics charts; axis text targets the Recharts tick-value class and uses the semantic muted-foreground token |
| AnalyticsClosureRadial | Business-neutral half-circle radial chart using the shadcn Radial Chart - Stacked pattern and chart-1 / chart-2 theme tokens. The two stacked segments use the caller-provided percentage and its presentation remainder (fixed total 100); the center percentage is the same value used by the geometry. Caller-provided numerator / remainder counts remain tooltip details only. |
| AnalyticsCountTrend | Business-neutral monthly count line chart; callers provide precomputed monthly rows and optional toolbar. The vertical domain starts at zero, adds modest headroom and uses integer ticks; monotone interpolation prevents negative overshoot. One stable LineChart receives latest rows directly and gates native Recharts animation through the shared reduced-motion hook. |
| AnalyticsMetricCard | Single presentation for numeric Dashboard summary cards: title, optional inline Info HoverCard, description, animated value, and a shared natural-height, spacing and typography contract. Used by Goals, Environment and UI Lab. Features provide business content and Grid composition; the component does not own grids, calculations, queries or status evaluation. |
| AnalyticsRefreshIndicator | Compact group-level updating status for stale Analytics results; positioned without changing layout and accepts only a refreshing flag |
| Analytics layout | `src/components/shared/analytics-layout.ts` owns the shared 17.125rem Card height, 24px page section spacing, 325ms number timing and 375ms chart timing |
| AnimatedNumber | Interpolates already-computed display values in 325ms; respects `prefers-reduced-motion` |
| TableCellTrigger | Provides compact native-button interaction, focus, pressed and a shared named group for clickable table content |
| DataTableColumnHeader | Reusable sortable column header bound to table state |
| DataTable | Shared TanStack row rendering, header sorting, adaptive 5 / 7 / 10 pagination, loading and empty shell for Access lists and the Overview store score list; Features provide columns, rows and column size roles; optional numeric sortValue separates sorting from display and keeps missing numbers last. Opt-in `stickyFirstColumn` fixes the first header, body and placeholder cells using shared opaque backgrounds; callers put the identity column first. Independent opt-ins `compactPrimaryColumn` and `compactOnMobile` adapt narrow containers or mobile column widths. Opt-in `onRowClick` adds whole-row pointer and keyboard activation without changing default tables, ignores nested interactive targets, and preserves row semantics. |
| SheetContent | Shared shadcn Sheet primitive; opt-in `mobileWidth="full"` uses the full viewport for left/right sheets below 640px. The default 75% mobile width and desktop maximum width remain unchanged. Overview scope details opt in; mobile Sidebar and other callers retain their defaults. |
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

### Overview feature presentation

| Component | Responsibility |
| --- | --- |
| DimensionScoreAccordion | Reused by Overview dimension analysis and scope detail; renders prepared raw or per-store points and deltas through shared DetailAccordion. On the Dashboard, a bounded desktop analysis grid gives the Matrix and Dimension Cards equal height; title and table header stay visible while expanded content scrolls inside the Dimension Card. Mobile stacks naturally. Scope Sheet content remains naturally sized. Numeric columns adapt to the containing section width, keeping headers, summaries and item rows aligned. Environment is an unscored footnote, not an empty accordion row. Main sections use h2; Sheet sections use h3. No score calculation. |
| ScopeComparison | Complete scoped store score list using shared DataTable, TableCellTrigger and OverflowTooltip; the row and store-name trigger open the same detail, while nested controls do not trigger the row. Keeps store identity first and fixed during horizontal scroll, with rank in a separate sortable column. Shows score rate, rate delta, earned/total points and point delta, with shared text/numeric sorting and scope detail entry. Point-change cells omit the unit already present in their column heading. |
| ScopeDetailSheet | Uses shared SheetContent with full mobile width, DetailHeader and DimensionScoreAccordion; preserves scroll reset, keyboard focus and return to the originating trigger. Matches other formal details: DetailHeader owns its 16px padding; the body uses px-4 / pb-4 / space-y-4 without an extra header shell or nested Card padding. The same OverviewScoreRateSummary as the main page includes the monthly comparison and shared “趋势” chart; only detail typography, value scale and spacing differ. Internal group headings use text-sm font-medium and the score uses text-2xl font-semibold. Period captions are owned by the Overview scope bar, not repeated in the Sheet. |
| OverviewAttentionChart | Uses shared ChartContainer for theme-aware axis text; renders prepared domains, groups and averages without changing score or grouping semantics. |
| ManagementSummary | Desktop composition uses aligned grid rows: score and both rankings share the first row; same-level comparison is on the left and dimensions on the right of the second row. Cards reuse the shadcn 24px padding/gap; titles, UI text and metadata follow project typography. All Overview values use the injected current business month; comparisons always use the prior natural month. The rate delta remains current rate minus prior rate and displays `%`, not relative growth. Dimension changes are actual score differences in points and use the `得分变化（分）` column label. Current and comparison month labels appear once in the scope/count bar. Overview does not show or query Global Period. |
| ChangeRankingList | Replaces the decorative podium with aligned visible positions, names, current rates and signed deltas. Keeps prepared order and complete supplied entries; each direction reserves three equal-height positions, with non-interactive dashes for absent entries (never zero values). Uses TableCellTrigger and measured OverflowTooltip. |
| AttentionMatrix | Same-level comparison offers existing Tabs for detail rows and the matrix. The matrix is always the first/default tab. Average score rate appears as muted text beneath the title; repeated scope/count captions are omitted. Panels flex within the shared Card row, while detail rows scroll inside their viewport. Scatter hover uses shared ChartTooltip with prepared names, score and delta; point buttons retain single-object drill-down and overlapping-object DropdownMenu selection. No Top N filter is applied. Detail rows preserve every member and reuse its group's prepared values; the matrix retains prepared grouping, domains and reference lines. Semantic scope changes reset the view. |
| OverviewMonthlyTrendChart | Shared by the Overview hero and scope detail Sheet. Both use a fixed 0–100% vertical domain with 0 / 25 / 50 / 75 / 100% ticks, visible month labels, shadcn chart color token, 3px dots and a 6px active dot. Hover / keyboard interaction reports the prepared month and value. Only available history months are passed to the chart; gaps are not interpolated. The hero chart fills available card height with a 160px minimum, matching the detail chart's 160px plot viewport without forcing equal parent heights. Existing animation duration and reduced-motion behavior are preserved. |

### System Monitoring

| Component | Responsibility |
| --- | --- |
| MonitoringPageContent | GLOBAL_ADMIN-only incident list using the shared DataTable and Sheet. The table shows latest error time, incident summary and aggregated occurrence count, sorted by latest occurrence descending; an independent time filter and refresh remain above it. Selecting a row shows error code, processing status / time, a shadcn Switch for status changes, then “复制诊断信息” above one JSON code block of linked diagnostic details. Development in-memory storage is explicitly labelled and seeds two clearly marked demo Incidents; an unconfigured production adapter shows “监控服务尚未配置” without an empty table implying no errors. Collection, incident correlation, notifications, retries, job monitoring, watchdog, recovery records and audit remain backend capabilities and are not exposed as separate tables. |
