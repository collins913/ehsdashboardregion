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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
              {description ? (
                <HoverCard openDelay={250} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <h1
                      tabIndex={0}
                      className="inline-flex text-2xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {title}
                    </h1>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="start">
                    {description}
                  </HoverCardContent>
                </HoverCard>
              ) : null}
              {!description ? (
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
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
