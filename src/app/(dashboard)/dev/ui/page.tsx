"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  dataTableClassName,
  dataTableColumnContentClassNames,
  dataTableColumnSizeClassNames,
  dataTableFrameClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
} from "@/components/shared/data-table-layout";
import { GlobalFilters } from "@/components/shared/global-filters";
import { MonthPicker } from "@/components/shared/month-picker";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  StatusDisplay,
  type BusinessStatus,
} from "@/components/shared/status-display";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GlobalFilterProvider } from "@/features/global-filters/global-filter-provider";
import { KpiDataTable } from "@/features/kpi/kpi-data-table";
import type { Month } from "@/types/ehs";
import {
  globalFilterUiState,
  globalFilterUiStores,
} from "./_fixtures/global-filter-ui-fixture";
import {
  demoKpiContext,
  demoKpiRows,
  queryDemoKpiActions,
  queryDemoKpiDetails,
} from "./_fixtures/kpi-ui-fixture";

const tokenSamples = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "border", className: "bg-border" },
  { name: "destructive", className: "bg-destructive" },
  { name: "ring", className: "bg-ring" },
] as const;

const businessStatuses: readonly BusinessStatus[] = [
  "ACHIEVED",
  "NOT_ACHIEVED",
  "UNDETERMINED",
  "OCCURRED",
  "NOT_OCCURRED",
  "OPEN",
  "CLOSED",
  "EXCLUDED",
  "UNKNOWN",
  "NORMAL",
  "ABNORMAL",
];

const badgeVariants = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
] as const;

function LabArea({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const id = `area-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DemoSurface({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DetailSheetDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">查看详情示例</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
        <SheetHeader>
          <SheetTitle>记录详情</SheetTitle>
          <SheetDescription>
            验证统一 Sheet 标题、字段和值的排布。
          </SheetDescription>
        </SheetHeader>
        <dl className="grid gap-4 px-4 pb-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">门店</dt>
            <dd className="mt-1 font-medium">示例星河店</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">负责人</dt>
            <dd className="mt-1">—</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">描述</dt>
            <dd className="mt-1 leading-6">
              这是一段用于验证详情面板长文本自然换行的示例内容，不代表任何正式业务记录。
            </dd>
          </div>
        </dl>
      </SheetContent>
    </Sheet>
  );
}

function ColumnSizingRolePreview() {
  return (
    <div className={dataTableFrameClassName}>
      <Table className={dataTableClassName}>
        <TableHeader>
          <TableRow>
            <TableHead
              className={`${dataTableColumnSizeClassNames.primary} ${stickyStoreHeaderClassName}`}
            >
              Primary
            </TableHead>
            <TableHead className={dataTableColumnSizeClassNames.content}>
              Content
            </TableHead>
            <TableHead className={dataTableColumnSizeClassNames.standard}>
              Standard
            </TableHead>
            <TableHead className={dataTableColumnSizeClassNames.compact}>
              Compact
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell
              className={`${dataTableColumnSizeClassNames.primary} ${stickyStoreCellClassName}`}
            >
              <OverflowTooltip
                text="辰岚浮光云庭新城引力场直营跃迁中心"
                className={dataTableColumnContentClassNames.primary}
              />
            </TableCell>
            <TableCell className={dataTableColumnSizeClassNames.content}>
              <OverflowTooltip
                text="这是用于观察正文列适度扩展并在合理阅读宽度停止增长的长文本。"
                className={dataTableColumnContentClassNames.content}
              />
            </TableCell>
            <TableCell className={dataTableColumnSizeClassNames.standard}>
              Ming LI（李 明）
            </TableCell>
            <TableCell className={dataTableColumnSizeClassNames.compact}>
              EVT-12345
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function UiLabPage() {
  const [month, setMonth] = useState<Month>("2026-09");
  const [showTableLoading, setShowTableLoading] = useState(false);
  const [filterPreview, setFilterPreview] = useState("ALL");

  return (
    <>
      <PageContainer className="py-6 lg:py-6">
        <h1 className="text-2xl font-semibold tracking-tight">UI Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          集中验证项目已采用的 Shared UI 与跨业务 Pattern。
        </p>
      </PageContainer>

      <PageContainer className="space-y-8 py-4 lg:py-4">
        <LabArea
          title="Foundations"
          description="项目级主题、排版层级与语义令牌。"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <DemoSurface
              title="主题"
              description="切换浅色、深色或跟随系统，整页同步验证。"
            >
              <ThemeToggle />
            </DemoSurface>
            <DemoSurface
              title="排版"
              description="仅保留项目正式使用的文字层级。"
            >
              <div className="space-y-2">
                <p className="text-2xl font-semibold tracking-tight">页面标题</p>
                <p className="text-lg font-semibold tracking-tight">区块标题</p>
                <p className="text-sm text-muted-foreground">辅助文字与元数据</p>
              </div>
            </DemoSurface>
            <DemoSurface
              title="语义令牌"
              description="组件只消费主题语义，不维护独立深色样式。"
            >
              <div className="grid grid-cols-2 gap-2">
                {tokenSamples.map((token) => (
                  <div key={token.name} className="flex items-center gap-2">
                    <span
                      className={`size-5 shrink-0 rounded border ${token.className}`}
                    />
                    <code className="text-xs">{token.name}</code>
                  </div>
                ))}
              </div>
            </DemoSurface>
          </div>
        </LabArea>

        <LabArea
          title="PageHeader"
          description="正式共享标题组件；说明文字通过标题的悬停或键盘焦点查看。"
        >
          <GlobalFilterProvider
            stores={globalFilterUiStores}
            initialState={globalFilterUiState}
            nowIso="2026-09-11T00:00:00.000Z"
            referenceMonth="2026-09"
          >
            <div className="space-y-4">
              <PageHeader
                title="页面标题示例"
                description="说明内容仅在悬停标题或键盘聚焦标题时显示。"
                breadcrumbs={[{ label: "带说明" }]}
              />
              <PageHeader
                title="无说明页面"
                breadcrumbs={[{ label: "无说明" }]}
              />
            </div>
          </GlobalFilterProvider>
        </LabArea>

        <LabArea
          title="Semantic UI"
          description="状态与数据可用性只有一套共享 presentation。"
        >
          <DemoSurface
            title="Badge"
            description="直接展示项目共享 Badge primitive 的 variants 与图标排布。"
          >
            <div className="flex flex-wrap items-center gap-2">
              {badgeVariants.map((variant) => (
                <Badge key={variant} variant={variant}>
                  {variant}
                </Badge>
              ))}
              <Badge variant="outline">
                <CheckCircle2 aria-hidden="true" />
                图标示例
              </Badge>
            </div>
          </DemoSurface>
          <DemoSurface
            title="FilterSelect"
            description="共享少量互斥筛选；使用 shadcn Select 的触发器、选中标记与键盘交互。"
          >
            <FilterSelect
              ariaLabel="筛选组件预览"
              value={filterPreview}
              options={[
                { value: "ALL", label: "全部" },
                { value: "OPEN_ONLY", label: "未关闭" },
              ]}
              onValueChange={setFilterPreview}
            />
          </DemoSurface>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <DemoSurface
              title="StatusDisplay"
              description="覆盖全部业务状态；Badge 外形继承共享 primitive。"
            >
              <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                {businessStatuses.map((status) => (
                  <div key={status} className="flex items-center justify-between gap-3">
                    <code className="text-xs text-muted-foreground">{status}</code>
                    <StatusDisplay status={status} />
                  </div>
                ))}
              </div>
            </DemoSurface>
            <DemoSurface
              title="DataAvailabilityDisplay"
              description="区分可用、确认空、数据不完整和不可用。"
            >
              <div className="flex flex-wrap gap-2">
                <DataAvailabilityDisplay availability="AVAILABLE" />
                <DataAvailabilityDisplay availability="CONFIRMED_EMPTY" />
                <DataAvailabilityDisplay availability="INCOMPLETE" />
                <DataAvailabilityDisplay availability="UNAVAILABLE" />
              </div>
            </DemoSurface>
          </div>
        </LabArea>

        <LabArea
          title="Shared Components"
          description="只展示需要独立检查边界或交互的共享组件。"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <DemoSurface
              title="OverflowTooltip"
              description="短文本不启用 Tooltip；真实溢出时才启用。"
            >
              <div className="space-y-3">
                <div className="w-48 rounded-md border px-3 py-2 text-sm">
                  <OverflowTooltip text="短门店名" className="w-full" />
                </div>
                <div className="w-48 rounded-md border px-3 py-2 text-sm">
                  <OverflowTooltip
                    text="用于验证真实溢出后才显示完整内容的超长门店名称"
                    className="w-full"
                  />
                </div>
              </div>
            </DemoSurface>
            <DemoSurface
              title="MonthPicker"
              description="统一选择一个自然月份，不承担 Period 计算。"
            >
              <MonthPicker
                value={month}
                onValueChange={setMonth}
                aria-label="月份示例"
              />
            </DemoSurface>
            <DemoSurface
              title="TableCellTrigger"
              description="提供紧凑点击、键盘、焦点和按压行为。"
            >
              <div className="flex flex-wrap gap-2">
                <TableCellTrigger aria-label="92% 可点击示例">
                  <StatusDisplay
                    status="ACHIEVED"
                    label="92%"
                    showIcon={false}
                    interactive
                  />
                </TableCellTrigger>
                <TableCellTrigger aria-label="68% 可点击示例">
                  <StatusDisplay
                    status="NOT_ACHIEVED"
                    label="68%"
                    showIcon={false}
                    interactive
                  />
                </TableCellTrigger>
              </div>
            </DemoSurface>
          </div>
        </LabArea>
      </PageContainer>

      <section aria-labelledby="area-adopted-patterns">
        <PageContainer className="pb-3 pt-4 lg:pb-3 lg:pt-4">
          <h2
            id="area-adopted-patterns"
            className="text-lg font-semibold tracking-tight"
          >
            Adopted Patterns
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            使用正式组件验证筛选、表格和详情面板组合。
          </p>
          <h3 className="mt-4 text-sm font-medium">Global Filters</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            唯一的可控 fixture 实例，保持正式全宽 Filter Bar 外观。
          </p>
        </PageContainer>

        <GlobalFilterProvider
          stores={globalFilterUiStores}
          initialState={globalFilterUiState}
          nowIso="2026-09-11T00:00:00.000Z"
          referenceMonth="2026-09"
        >
          <GlobalFilters />
        </GlobalFilterProvider>

        <PageContainer className="space-y-6 py-6 lg:py-6">
          <div>
            <h3 className="text-sm font-medium">Representative Data Table</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              先验证 primary、content、standard、compact 四种共享列宽角色，再通过正式 KpiDataTable 验证排序、列显示、Sticky Store、状态、可用性、点击单元格和 5 / 7 / 10 自适应分页。
            </p>
            <div className="mt-3 space-y-4">
              <ColumnSizingRolePreview />
              <Button
                variant="outline"
                size="sm"
                aria-pressed={showTableLoading}
                onClick={() => setShowTableLoading((current) => !current)}
              >
                {showTableLoading ? "显示正式数据" : "验证加载占位"}
              </Button>
              <KpiDataTable
                rows={demoKpiRows}
                context={demoKpiContext}
                referenceDateIso="2026-09-11T00:00:00+08:00"
                queryActions={queryDemoKpiActions}
                queryKpiDetails={queryDemoKpiDetails}
                queryStatus={showTableLoading ? "LOADING" : "READY"}
              />
            </div>
          </div>

          <DemoSurface
            title="Detail Sheet"
            description="最小验证 trigger、Header、字段排布、长文本与空值。"
          >
            <DetailSheetDemo />
          </DemoSurface>
        </PageContainer>
      </section>
    </>
  );
}
