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
import { demoKpiRows } from "./kpi-demo-data";
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
        title="UI Lab"
        description="Implemented design tokens and adopted UI components."
        breadcrumbs={[{ label: "Development" }, { label: "UI Lab" }]}
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

        <LabSection title="Typography">
          <div className="space-y-3">
            <p className="text-2xl font-semibold tracking-tight">Page title</p>
            <p className="text-lg font-semibold tracking-tight">Section heading</p>
            <p className="text-base">Body text</p>
            <p className="text-sm text-muted-foreground">Supporting text</p>
            <p className="text-xs text-muted-foreground">Metadata</p>
          </div>
        </LabSection>

        <Separator />

        <LabSection title="Semantic tokens">
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

        <LabSection title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
        </LabSection>

        <Separator />

        <LabSection title="Business status">
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

        <LabSection title="Data availability">
          <div className="flex flex-wrap gap-3">
            <KpiDataAvailabilityDisplay availability="AVAILABLE" />
            <KpiDataAvailabilityDisplay availability="INCOMPLETE" />
            <KpiDataAvailabilityDisplay availability="UNAVAILABLE" />
          </div>
        </LabSection>

        <Separator />

        <LabSection title="KPI data table">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sort columns, filter abnormal rows, change column visibility, page through
              stores, scroll horizontally, and open an Actions value.
            </p>
            <KpiDataTable rows={demoKpiRows} />
          </div>
        </LabSection>

        <Separator />

        <LabSection title="KPI data table empty state">
          <KpiDataTable rows={[]} />
        </LabSection>

        <Separator />

        <LabSection title="Sidebar states">
          <SidebarStateDemo />
        </LabSection>

        <Separator />

        <LabSection title="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/overview">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>UI Lab</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </LabSection>

        <Separator />

        <LabSection title="Avatar and dropdown menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Avatar className="size-5">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                Open menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Example menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Menu item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </LabSection>

        <Separator />

        <LabSection title="Loading skeleton">
          <div className="max-w-md space-y-3" aria-label="Loading example">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </LabSection>

        <Separator />

        <LabSection title="Spacing">
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
