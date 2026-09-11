import type { LucideIcon } from "lucide-react";
import {
  Award,
  FileText,
  Gauge,
  LayoutDashboard,
  Leaf,
  ListChecks,
  Store,
  Target,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  href: `/${string}`;
  icon: LucideIcon;
  section?: string;
};

export type NavigationGroup = {
  label?: string;
  items: NavigationItem[];
};

export const applicationName = "EHS 管理看板";

export const navigationLabels = {
  performance: "绩效",
  riskAndCompliance: "风险与合规",
} as const;

export const routes = {
  overview: { title: "总览", href: "/overview", icon: LayoutDashboard },
  performanceKpi: {
    title: "KPI",
    href: "/performance/kpi",
    icon: Gauge,
    section: navigationLabels.performance,
  },
  performanceGoals: {
    title: "目标",
    href: "/performance/goals",
    icon: Target,
    section: navigationLabels.performance,
  },
  riskEvents: {
    title: "事件",
    href: "/risk/events",
    icon: FileText,
    section: navigationLabels.riskAndCompliance,
  },
  riskActions: {
    title: "行动项",
    href: "/risk/actions",
    icon: ListChecks,
    section: navigationLabels.riskAndCompliance,
  },
  riskCertificates: {
    title: "证件",
    href: "/risk/certificates",
    icon: Award,
    section: navigationLabels.riskAndCompliance,
  },
  riskEnvironment: {
    title: "环境",
    href: "/risk/environment",
    icon: Leaf,
    section: navigationLabels.riskAndCompliance,
  },
  stores: { title: "门店", href: "/stores", icon: Store },
} satisfies Record<string, NavigationItem>;

export const homeBreadcrumb = {
  label: "首页",
  href: routes.overview.href,
} as const;

export const navigationGroups: NavigationGroup[] = [
  { items: [routes.overview] },
  {
    label: navigationLabels.performance,
    items: [routes.performanceKpi, routes.performanceGoals],
  },
  {
    label: navigationLabels.riskAndCompliance,
    items: [
      routes.riskEvents,
      routes.riskActions,
      routes.riskCertificates,
      routes.riskEnvironment,
    ],
  },
  { items: [routes.stores] },
];
