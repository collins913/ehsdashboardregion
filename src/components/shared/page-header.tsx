import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { GlobalFilters } from "@/components/shared/global-filters";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { homeBreadcrumb } from "@/config/navigation";

type BreadcrumbEntry = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}: PageHeaderProps) {
  return (
    <>
      <header className="border-b bg-background">
        <PageContainer className="py-4 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4! self-center!" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={homeBreadcrumb.href}>{homeBreadcrumb.label}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((entry, index) => (
                  <Fragment key={`${entry.label}-${index}`}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {entry.href ? (
                        <BreadcrumbLink asChild>
                          <Link href={entry.href}>{entry.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{entry.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto shrink-0">
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </PageContainer>
      </header>
      <GlobalFilters />
    </>
  );
}
