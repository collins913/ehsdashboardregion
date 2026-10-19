"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { AnalyticsClosureRadial } from "@/components/shared/analytics-closure-radial";
import { AnalyticsProgressItem } from "@/components/shared/analytics-progress-item";
import { AnalyticsMetricCard } from "@/components/shared/analytics-metric-card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { DetailAccordion, DetailAccordionItem } from "@/components/shared/detail-accordion";
import { DetailField, DetailFields } from "@/components/shared/detail-field";
import { DetailHeader } from "@/components/shared/detail-header";
import { DetailRecordCard } from "@/components/shared/detail-record-card";
import { FilterSelect } from "@/components/shared/filter-select";
import {
  dataTableClassName,
  dataTableColumnContentClassNames,
  dataTableColumnSizeClassNames,
  dataTableFrameClassName,
  dataTableRowClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
} from "@/components/shared/data-table-layout";
import { GlobalFilters } from "@/components/shared/global-filters";
import { MonthPicker } from "@/components/shared/month-picker";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { PageErrorState } from "@/components/shared/page-error-state";
import {
  StatusDisplay,
} from "@/components/shared/status-display";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContents, TabsContent } from "@/components/ui/tabs";
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
import { KpiStatusDisplay } from "@/features/kpi/kpi-status-display";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
import { getTakeChargeSourceStatusLabel, getTakeChargeStatusIcon } from "@/features/goals/take-charge-status-presentation";
import { CERTIFICATE_CATEGORIES, CERTIFICATE_TYPE_CATEGORIES } from "@/lib/rules/certificate-types";
import type { KnownActionStatus, Month } from "@/types/ehs";
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
  { id: "value", title: "数值", value: (row) => row.value === null ? "—" : String(row.value), sortValue: (row) => row.value, sizeRole: "compact", align: "right" },
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

const actionStatusSamples = [
  "Assigned", "In Progress", "In Review", "Sign Off", "Cancelled", "Closed",
] as const satisfies readonly KnownActionStatus[];

// Prepared display examples; lifecycle classification stays in the server/rule layer.
const takeChargeStatusSamples = [
  { sourceStatus: "Submitted", recordState: "OPEN" },
  { sourceStatus: "InProgress", recordState: "OPEN" },
  { sourceStatus: "PendingReview", recordState: "OPEN" },
  { sourceStatus: "Declined", recordState: "CLOSED" },
  { sourceStatus: "ClosedWithAction", recordState: "CLOSED" },
  { sourceStatus: "ClosedWithoutAction", recordState: "CLOSED" },
] as const;

const badgeVariants = [
  { value: "default", label: "默认" },
  { value: "secondary", label: "次要" },
  { value: "destructive", label: "警示" },
  { value: "outline", label: "描边" },
  { value: "ghost", label: "透明" },
] as const;

function DemoSurface({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailSheetDemo({ mobileWidth = "default" }: { mobileWidth?: "default" | "full" }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{mobileWidth === "full" ? "手机全宽" : "标准宽度"}</Button>
      </SheetTrigger>
      <SheetContent mobileWidth={mobileWidth} className="overflow-y-auto">
        <DetailHeader
          title="特种作业"
          subtitle="示例星河店"
          resultLabel="当前结果"
          result={<StatusDisplay status="ABNORMAL" />}
        />
        <div className="space-y-4 px-4 pb-4">
          <DetailAccordion>
            <DetailAccordionItem title="焊接作业证" value="welding" count={1} attention cardContent>
              <DetailRecordCard
                header="Yue SUN（孙悦）"
                action={<StatusDisplay status="ABNORMAL" />}
              >
                <DetailFields className="grid-cols-2">
                  <DetailField label="岗位" className="col-span-2">可自然换行的岗位名称示例</DetailField>
                  <DetailField label="到期日期">2026-09-06</DetailField>
                  <DetailField label="距离到期">-5 天</DetailField>
                </DetailFields>
              </DetailRecordCard>
            </DetailAccordionItem>
            <DetailAccordionItem title="空证件类别" value="empty" count={0} disabled>
              <p className="text-sm text-muted-foreground">无记录</p>
            </DetailAccordionItem>
            <DetailAccordionItem title="带摘要的信息组" value="summary" summary={<span className="tabular-nums">3/5</span>}>
              <p className="text-sm text-muted-foreground">折叠摘要示例。</p>
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
              主要字段
            </TableHead>
            <TableHead className={dataTableColumnSizeClassNames.content}>
              正文
            </TableHead>
            <TableHead className={dataTableColumnSizeClassNames.standard}>
              姓名
            </TableHead>
            <TableHead className={dataTableColumnSizeClassNames.compact}>
              编号
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className={dataTableRowClassName}>
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
                text="长文本示例：空间不足时省略，悬停可查看完整内容。"
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
  const [tab, setTab] = useState("basics");
  const [errorPreview, setErrorPreview] = useState<"page" | "system" | null>(null);
  const [month, setMonth] = useState<Month>("2026-09");
  const [showTableLoading, setShowTableLoading] = useState(false);
  const [selectedSampleRow, setSelectedSampleRow] = useState<string | null>(null);
  const [filterPreview, setFilterPreview] = useState("ALL");
  const [animatedNumberPreview, setAnimatedNumberPreview] = useState(52);

  useEffect(() => {
    const openLinkedPreview = () => {
      if (window.location.hash === "#error-preview") setTab("states");
    };
    openLinkedPreview();
    window.addEventListener("hashchange", openLinkedPreview);
    return () => window.removeEventListener("hashchange", openLinkedPreview);
  }, []);

  if (errorPreview) {
    return <PageErrorState preview system={errorPreview === "system"} reset={() => setErrorPreview(null)} />;
  }

  return (
    <Tabs animated value={tab} onValueChange={setTab} className="gap-0">
      <PageContainer className="pb-0 lg:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList variant="line" aria-label="组件分类">
            <TabsTrigger value="basics">基础</TabsTrigger>
            <TabsTrigger value="states">状态</TabsTrigger>
            <TabsTrigger value="charts">图表</TabsTrigger>
            <TabsTrigger value="tables">表格</TabsTrigger>
            <TabsTrigger value="details">筛选与详情</TabsTrigger>
          </TabsList>
        </div>
      </PageContainer>

      <TabsContents mode="auto-height">
      <TabsContent value="basics">
        <PageContainer className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DemoSurface title="文字层级">
            <div className="space-y-3">
              <p className="text-2xl font-semibold tracking-tight">页面标题</p>
              <CardTitle>卡片标题</CardTitle>
              <p className="text-base">正文内容</p>
              <p className="text-sm text-muted-foreground">辅助文字</p>
              <p className="text-xs text-muted-foreground">元数据</p>
            </div>
          </DemoSurface>
          <DemoSurface title="主题色">
            <div className="grid grid-cols-2 gap-3">
              {tokenSamples.map((token) => (
                <div key={token.name} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`size-5 shrink-0 rounded border ${token.className}`} />
                  <code className="text-xs">{token.name}</code>
                </div>
              ))}
            </div>
          </DemoSurface>
          <DemoSurface title="选择器">
            <div className="space-y-4">
              <FilterSelect
                ariaLabel="单选筛选"
                value={filterPreview}
                options={[{ value: "ALL", label: "全部" }, { value: "OPEN_ONLY", label: "未关闭" }]}
                onValueChange={setFilterPreview}
              />
              <MonthPicker value={month} onValueChange={setMonth} aria-label="选择月份" />
            </div>
          </DemoSurface>
          <DemoSurface title="文本溢出" description="悬停或聚焦查看全文。">
            <div className="space-y-3">
              <div className="w-48 max-w-full">
                <OverflowTooltip text="短门店名" className="w-full" />
              </div>
              <div className="w-48 max-w-full">
                <OverflowTooltip text="用于查看文本省略效果的超长门店名称示例" className="w-full" />
              </div>
              {["短按钮文本", "用于查看按钮内省略效果的超长门店名称示例"].map((text) => (
                <OverflowTooltip key={text} text={text} className="w-full" renderTrigger={(label) => (
                  <Button variant="outline" className="w-48 max-w-full justify-start" aria-label={text}>{label}</Button>
                )} />
              ))}
            </div>
          </DemoSurface>
          <DemoSurface title="页签动画">
            <Tabs animated defaultValue="matrix">
              <TabsList aria-label="动画示例">
                <TabsTrigger value="matrix">矩阵</TabsTrigger>
                <TabsTrigger value="list">明细</TabsTrigger>
              </TabsList>
              <TabsContents className="min-h-24">
                <TabsContent value="matrix"><p>矩阵内容</p></TabsContent>
                <TabsContent value="list"><p>明细内容</p></TabsContent>
              </TabsContents>
            </Tabs>
          </DemoSurface>
        </PageContainer>
      </TabsContent>

      <TabsContent value="states">
        <PageContainer className="space-y-4">
          <section aria-label="业务状态分类" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {["培训", "演练", "检查"].map((title) => (
              <DemoSurface key={title} title={title}>
                <dl className="space-y-3">
                  <div>
                    <dt className="mb-2 text-xs text-muted-foreground">汇总结果</dt>
                    <dd className="flex flex-wrap gap-2">
                      <KpiStatusDisplay status="ACHIEVED" />
                      <KpiStatusDisplay status="NOT_ACHIEVED" />
                      <DataAvailabilityDisplay availability="INCOMPLETE" />
                      <DataAvailabilityDisplay availability="UNAVAILABLE" />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-2 text-xs text-muted-foreground">{title === "培训" ? "记录状态" : "记录状态示例（保留源文字）"}</dt>
                    <dd className="flex flex-wrap gap-2">
                      <KpiStatusDisplay status="ACHIEVED" label={title === "培训" ? undefined : "已完成"} />
                      <KpiStatusDisplay status="NOT_ACHIEVED" label={title === "培训" ? undefined : "进行中"} />
                      {title === "培训" ? <KpiStatusDisplay status="UNDETERMINED" /> : <KpiStatusDisplay status="UNDETERMINED" label="—" />}
                    </dd>
                  </div>
                </dl>
              </DemoSurface>
            ))}
            <DemoSurface title="行动项">
              <div className="flex flex-wrap gap-2">
                {actionStatusSamples.map((value) => <ActionStatusDisplay key={value} status={{ kind: "KNOWN", value }} />)}
                <ActionStatusDisplay status={{ kind: "UNKNOWN", value: "" }} />
              </div>
            </DemoSurface>
            <DemoSurface title="事件">
              <dl className="space-y-3">
                <div>
                  <dt className="mb-2 text-xs text-muted-foreground">事件记录</dt>
                  <dd className="flex flex-wrap gap-2">
                    <StatusDisplay status="OPEN" />
                    <StatusDisplay status="CLOSED" />
                    <StatusDisplay status="UNKNOWN" />
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-xs text-muted-foreground">ASTM 发生情况</dt>
                  <dd className="flex flex-wrap gap-2">
                    <StatusDisplay status="OCCURRED" />
                    <StatusDisplay status="NOT_OCCURRED" />
                  </dd>
                </div>
              </dl>
            </DemoSurface>
            <DemoSurface title="Take Charge">
              <div className="flex flex-wrap gap-2">
                {takeChargeStatusSamples.map(({ sourceStatus, recordState }) => (
                  <StatusDisplay key={sourceStatus} status={recordState} label={getTakeChargeSourceStatusLabel(sourceStatus)} icon={getTakeChargeStatusIcon(recordState)} />
                ))}
                <StatusDisplay status="UNKNOWN" icon={getTakeChargeStatusIcon("UNKNOWN")} />
              </div>
            </DemoSurface>
            {CERTIFICATE_CATEGORIES.map((category) => (
              <DemoSurface key={category} title={`证件 · ${category}`}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusDisplay status="NORMAL" />
                    <StatusDisplay status="ABNORMAL" />
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {Object.entries(CERTIFICATE_TYPE_CATEGORIES).filter(([, group]) => group === category).map(([type]) => (
                      <li key={type}><OverflowTooltip text={type} /></li>
                    ))}
                  </ul>
                </div>
              </DemoSurface>
            ))}
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <DemoSurface title="数据可用性">
              <div className="flex flex-wrap gap-2">
                <DataAvailabilityDisplay availability="AVAILABLE" />
                <DataAvailabilityDisplay availability="CONFIRMED_EMPTY" />
                <DataAvailabilityDisplay availability="INCOMPLETE" description="2026-03：示例培训：完成率字段为空" />
                <DataAvailabilityDisplay availability="UNAVAILABLE" />
              </div>
            </DemoSurface>
            <DemoSurface title="基础标签">
              <div className="flex flex-wrap items-center gap-2">
                {badgeVariants.map(({ value, label }) => (
                  <Badge key={value} variant={value}>{label}</Badge>
                ))}
                <Badge variant="outline"><CheckCircle2 aria-hidden="true" />带图标</Badge>
              </div>
            </DemoSurface>
            <section id="error-preview" aria-labelledby="error-preview-title" className="space-y-3">
              <h2 id="error-preview-title" className="text-base font-medium">错误页</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setErrorPreview("page")}>页面错误</Button>
                <Button variant="outline" onClick={() => setErrorPreview("system")}>系统错误</Button>
              </div>
              <p className="text-xs text-muted-foreground">仅预览，不记录故障。</p>
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section aria-label="加载反馈"><AsyncQueryFeedback status="LOADING" /></section>
            <section aria-label="错误反馈"><AsyncQueryFeedback status="ERROR" errorCode="INVALID_QUERY_INPUT" /></section>
          </div>
        </PageContainer>
      </TabsContent>

      <TabsContent value="charts">
        <PageContainer className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AnalyticsMetricCard title="提交总数" subtitle="2026-07 至 2026-09" value={animatedNumberPreview} info={<p>提交总数示例。</p>} />
            <AnalyticsMetricCard title="平均提交数" subtitle="2026 年" value={5.9} formatter={(value) => value.toFixed(1)} info={<p>保留一位小数。</p>} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <AnalyticsClosureRadial title="关闭情况" rate={33} rateLabel="关闭率" statusCounts={[{ label: "进行中", count: 3000 }, { label: "已分配", count: 2396 }, { label: "已关闭", count: 2604 }]} />
            <DemoSurface title="证件数量进度">
              <ul className="space-y-4">
                <AnalyticsProgressItem label="安全生产管理人员安全生产培训合格证书-M" actualCount={468} requiredCount={500} progressValue={93.6} missingRequirementLabel="未设置" />
                <AnalyticsProgressItem label="安全驾驶内驾证" actualCount={492} requiredCount={null} progressValue={null} missingRequirementLabel="未设置" />
              </ul>
            </DemoSurface>
            <DemoSurface title="数字动画">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-16 text-2xl font-semibold tabular-nums"><AnimatedNumber value={animatedNumberPreview} /></span>
                {[31, 67].map((value) => (
                  <Button key={value} variant="outline" size="sm" onClick={() => setAnimatedNumberPreview(value)}>{value}</Button>
                ))}
              </div>
            </DemoSurface>
          </div>
        </PageContainer>
      </TabsContent>

      <TabsContent value="tables">
        <PageContainer className="space-y-6">
          <section aria-label="列宽示例" className="space-y-3">
            <h2 className="text-base font-medium">列宽与文本省略</h2>
            <ColumnSizingRolePreview />
          </section>
          <section aria-label="表格单元格交互" className="space-y-3">
            <h2 className="text-base font-medium">单元格交互</h2>
            <div className="flex flex-wrap gap-2">
              <TableCellTrigger variant="link" aria-label="查看 77%">77%</TableCellTrigger>
              <TableCellTrigger variant="link" aria-label="查看 ASTM 事件">无</TableCellTrigger>
              <TableCellTrigger aria-label="查看已完成"><StatusDisplay status="ACHIEVED" label="已完成" interactive /></TableCellTrigger>
              <TableCellTrigger aria-label="查看进行中"><StatusDisplay status="OPEN" label="进行中" interactive /></TableCellTrigger>
              <TableCellTrigger aria-label="查看不完整数据"><DataAvailabilityDisplay availability="INCOMPLETE" /></TableCellTrigger>
            </div>
          </section>
          <section aria-label="数值排序与整行点击" className="space-y-3">
            <h2 className="text-base font-medium">数值排序与整行点击</h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">{selectedSampleRow ? `已选择：${selectedSampleRow}` : "点击或用键盘选择一行。"}</p>
            <DataTable rows={numericSortRows} columns={numericSortColumns} stickyFirstColumn compactPrimaryColumn emptyMessage="无样例数据"
              onRowClick={(row) => setSelectedSampleRow(row.label)} rowAriaLabel={(row) => `选择${row.label}`} />
          </section>
          <section aria-label="KPI 表格预览" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-medium">KPI 表格</h2>
              <Button variant="outline" size="sm" aria-pressed={showTableLoading} onClick={() => setShowTableLoading((current) => !current)}>
                {showTableLoading ? "显示示例数据" : "显示加载状态"}
              </Button>
            </div>
            <KpiDataTable rows={demoKpiRows} context={demoKpiContext} referenceDateIso="2026-09-11T00:00:00+08:00"
              queryActions={queryDemoKpiActions} queryKpiDetails={queryDemoKpiDetails} queryStatus={showTableLoading ? "LOADING" : "READY"} />
          </section>
        </PageContainer>
      </TabsContent>

      <TabsContent value="details" className="space-y-6">
        <GlobalFilterProvider stores={globalFilterUiStores} initialState={globalFilterUiState} nowIso="2026-09-11T00:00:00.000Z" referenceMonth="2026-09">
          <PageHeader title="页面标题示例" description="悬停或聚焦标题查看说明。" breadcrumbs={[{ label: "标题示例" }]} />
          <GlobalFilters />
        </GlobalFilterProvider>
        <PageContainer className="space-y-6">
          <section aria-label="详情卡片" className="space-y-3">
            <h2 className="text-base font-medium">详情卡片</h2>
            <div className="max-w-xl">
              <DetailRecordCard header="月度应急演练 10" description="2026 年 10 月" action={<StatusDisplay status="ACHIEVED" label="已完成" />} />
            </div>
          </section>
          <section aria-label="详情面板" className="space-y-3">
            <h2 className="text-base font-medium">详情面板</h2>
            <div className="flex flex-wrap gap-2">
              <DetailSheetDemo />
              <DetailSheetDemo mobileWidth="full" />
            </div>
          </section>
        </PageContainer>
      </TabsContent>
      </TabsContents>
    </Tabs>
  );
}
