"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { AnalyticsMetricCard } from "@/components/shared/analytics-metric-card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { DetailAccordion, DetailAccordionItem } from "@/components/shared/detail-accordion";
import { DetailField } from "@/components/shared/detail-field";
import { DetailHeader } from "@/components/shared/detail-header";
import { DetailRecordCard } from "@/components/shared/detail-record-card";
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

const numericSortRows = [
  { id: "numeric-2", label: "样例 2", value: 2 },
  { id: "numeric-100", label: "样例 100", value: 100 },
  { id: "numeric-missing", label: "缺失样例", value: null },
  { id: "numeric-10", label: "样例 10", value: 10 },
];
const numericSortColumns: DataTableColumn<(typeof numericSortRows)[number]>[] = [
  { id: "label", title: "名称", value: (row) => row.label, sizeRole: "primary" },
  { id: "value", title: "数值", value: (row) => row.value === null ? "—" : String(row.value), sortValue: (row) => row.value, sizeRole: "compact" },
];

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

function DetailSheetDemo({ mobileWidth = "default" }: { mobileWidth?: "default" | "full" }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{mobileWidth === "full" ? "查看手机全宽详情" : "查看详情示例"}</Button>
      </SheetTrigger>
      <SheetContent mobileWidth={mobileWidth} className="overflow-y-auto">
        <DetailHeader
          title="特种作业"
          subtitle="示例星河店"
          resultLabel="当前结果"
          result={<StatusDisplay status="NORMAL" />}
        />
        <div className="space-y-4 px-4 pb-4">
          <DetailAccordion>
            <DetailAccordionItem title="焊接作业证" value="welding" count={1} attention>
              <DetailRecordCard
                header={
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-medium">Yue SUN（孙悦）</p>
                    <StatusDisplay status="ABNORMAL" />
                  </div>
                }
              >
                <div className="space-y-4">
                  <DetailField label="岗位">可自然换行的岗位名称示例</DetailField>
                  <dl className="grid grid-cols-2 gap-4">
                    <DetailField label="到期日期">2026-09-21</DetailField>
                    <DetailField label="距离到期">-5 天</DetailField>
                  </dl>
                </div>
              </DetailRecordCard>
            </DetailAccordionItem>
            <DetailAccordionItem title="空证件类别" value="empty" count={0} disabled>
              <p className="text-sm text-muted-foreground">无记录</p>
            </DetailAccordionItem>
            <DetailAccordionItem title="带摘要的信息组" value="summary" summary={<span className="tabular-nums">3/5</span>}>
              <p className="text-sm text-muted-foreground">摘要由调用方提供，展开内容沿用共享 Accordion。</p>
            </DetailAccordionItem>
          </DetailAccordion>
        </div>
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
  const [selectedSampleRow, setSelectedSampleRow] = useState<string | null>(null);
  const [filterPreview, setFilterPreview] = useState("ALL");
  const [animatedNumberPreview, setAnimatedNumberPreview] = useState(52);

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
              description="短文本不启用 Tooltip；真实溢出时支持悬停或键盘聚焦，按钮内不增加 Tab 停靠点。"
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
                {["短按钮文本", "用于验证按钮聚焦时可见完整内容的超长门店名称"].map((text) => (
                  <OverflowTooltip key={text} text={text} className="w-full" renderTrigger={(label) => (
                    <Button variant="outline" className="w-48 justify-start" aria-label={text}>{label}</Button>
                  )} />
                ))}
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
              title="AnimatedNumber"
              description="仅演示 resolved 数值更新插值，并尊重系统减少动态效果设置。"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-16 text-2xl font-semibold tabular-nums">
                  <AnimatedNumber value={animatedNumberPreview} />
                </span>
                {[31, 67].map((value) => (
                  <Button key={value} variant="outline" size="sm" onClick={() => setAnimatedNumberPreview(value)}>
                    显示 {value}
                  </Button>
                ))}
              </div>
            </DemoSurface>
            <DemoSurface
              title="AnalyticsMetricCard"
              description="数字型 Dashboard 卡片共用标题、说明、Info 和数值的 presentation，并用调用方 formatter 展示数值。"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AnalyticsMetricCard
                  title="提交总数"
                  subtitle="2026-07 至 2026-09"
                  value={animatedNumberPreview}
                  info={<p>已预计算的整数值，展示统一的指标卡样式。</p>}
                />
                <AnalyticsMetricCard
                  title="平均提交数"
                  subtitle="2026 年"
                  value={5.9}
                  formatter={(value) => value.toFixed(1)}
                  info={<p>已预计算的一位小数值。</p>}
                />
              </div>
            </DemoSurface>
            <DemoSurface
              title="TableCellTrigger"
              description="使用官方 ghost / sm Button 的尺寸、键盘、焦点和按压行为。"
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
            唯一的可控 fixture 实例；门店搜索复用 InputGroup 与 Checkbox，勾选状态对应真实选择。
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
              <section aria-label="共享表格数值排序">
                <h4 className="mb-2 text-sm font-medium">共享表格数值排序与固定首列</h4>
                <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">{selectedSampleRow ? `已选择：${selectedSampleRow}` : "支持可选整行点击；键盘聚焦后按 Enter 或空格打开。"}</p>
                <DataTable rows={numericSortRows} columns={numericSortColumns} stickyFirstColumn compactPrimaryColumn emptyMessage="无样例数据"
                  onRowClick={(row) => setSelectedSampleRow(row.label)} rowAriaLabel={(row) => `选择${row.label}`} />
              </section>
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
            <div className="flex flex-wrap gap-2">
              <DetailSheetDemo />
              <DetailSheetDemo mobileWidth="full" />
            </div>
          </DemoSurface>
        </PageContainer>
      </section>
    </>
  );
}
