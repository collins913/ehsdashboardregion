import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  StatusDisplay,
  type BusinessStatus,
} from "@/components/shared/status-display";
import {
  KpiDataAvailabilityDisplay,
  KpiDataTable,
} from "@/features/kpi/kpi-data-table";
import { homeBreadcrumb } from "@/config/navigation";
import { demoKpiRows } from "./_fixtures/kpi-ui-fixture";
import { SidebarStateDemo } from "./sidebar-state-demo";

const tokenSamples = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "popover", className: "bg-popover" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
  { name: "input", className: "bg-input" },
  { name: "ring", className: "bg-ring" },
];

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

function LabSection({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function UiLabPage() {
  return (
    <>
      <PageHeader
        title="UI 组件预览"
        description="展示项目已经采用的设计令牌和界面组件。"
        breadcrumbs={[{ label: "开发工具" }, { label: "UI 组件预览" }]}
      />
      <PageContainer className="space-y-8">
        <LabSection title="主题模式">
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            <p className="text-sm text-muted-foreground">
              切换浅色、深色或跟随系统，检查本页全部组件的语义色表现。
            </p>
          </div>
        </LabSection>

        <Separator />

        <LabSection title="排版">
          <div className="space-y-3">
            <p className="text-2xl font-semibold tracking-tight">页面标题</p>
            <p className="text-lg font-semibold tracking-tight">区块标题</p>
            <p className="text-base">正文</p>
            <p className="text-sm text-muted-foreground">辅助文字</p>
            <p className="text-xs text-muted-foreground">元数据</p>
          </div>
        </LabSection>

        <Separator />

        <LabSection title="语义令牌">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tokenSamples.map((token) => (
              <div key={token.name} className="flex items-center gap-3 rounded-lg border p-3">
                <span className={`size-8 rounded-md border ${token.className}`} />
                <code className="text-sm">{token.name}</code>
              </div>
            ))}
          </div>
        </LabSection>

        <Separator />

        <LabSection title="按钮">
          <div className="flex flex-wrap gap-2">
            <Button>主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">描边按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="destructive">危险操作</Button>
            <Button disabled>禁用</Button>
          </div>
        </LabSection>

        <Separator />

        <LabSection title="业务状态">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businessStatuses.map((status) => (
              <div
                key={status}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <code className="text-xs">{status}</code>
                <StatusDisplay status={status} />
              </div>
            ))}
          </div>
        </LabSection>

        <Separator />

        <LabSection title="数据可用性">
          <div className="flex flex-wrap gap-3">
            <KpiDataAvailabilityDisplay availability="AVAILABLE" />
            <KpiDataAvailabilityDisplay availability="INCOMPLETE" />
            <KpiDataAvailabilityDisplay availability="UNAVAILABLE" />
          </div>
        </LabSection>

        <Separator />

        <LabSection title="KPI 数据表">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              支持列排序、仅看异常、列显示、分页、横向滚动和行动项明细。
            </p>
            <KpiDataTable rows={demoKpiRows} />
          </div>
        </LabSection>

        <Separator />

        <LabSection title="KPI 数据表空状态">
          <KpiDataTable rows={[]} />
        </LabSection>

        <Separator />

        <LabSection title="侧边栏状态">
          <SidebarStateDemo />
        </LabSection>

        <Separator />

        <LabSection title="面包屑导航">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={homeBreadcrumb.href}>
                  {homeBreadcrumb.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>UI 组件预览</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </LabSection>

        <Separator />

        <LabSection title="头像和下拉菜单">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Avatar className="size-5">
                  <AvatarFallback>用</AvatarFallback>
                </Avatar>
                打开菜单
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>示例菜单</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>菜单项</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </LabSection>

        <Separator />

        <LabSection title="加载骨架">
          <div className="max-w-md space-y-3" aria-label="加载示例">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </LabSection>

        <Separator />

        <LabSection title="间距">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-8">2</span><span className="h-2 w-2 bg-primary" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8">4</span><span className="h-2 w-4 bg-primary" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8">6</span><span className="h-2 w-6 bg-primary" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8">8</span><span className="h-2 w-8 bg-primary" />
            </div>
          </div>
        </LabSection>
      </PageContainer>
    </>
  );
}
