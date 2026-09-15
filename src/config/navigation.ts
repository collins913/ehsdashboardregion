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
  description?: string;
  showDashboardHeader?: boolean;
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
    description: "查看当前筛选范围内各门店的 EHS 关键绩效指标",
  },
  performanceGoals: {
    title: "目标",
    href: "/performance/goals",
    icon: Target,
    section: navigationLabels.performance,
    description: "查看 Take Charge 提交、关闭与年度参与绩效",
  },
  riskEvents: {
    title: "事件",
    href: "/risk/events",
    icon: FileText,
    section: navigationLabels.riskAndCompliance,
    description: "查看当前筛选范围内的事件及处理状态",
  },
  riskActions: {
    title: "行动项",
    href: "/risk/actions",
    icon: ListChecks,
    section: navigationLabels.riskAndCompliance,
    description: "查看当前筛选范围内的行动项及处理状态",
  },
  riskCertificates: {
    title: "证件",
    href: "/risk/certificates",
    icon: Award,
    section: navigationLabels.riskAndCompliance,
    description: "查看各门店当前证件分类状态与证件明细",
  },
  riskEnvironment: {
    title: "环境",
    href: "/risk/environment",
    icon: Leaf,
    section: navigationLabels.riskAndCompliance,
    description: "查看当前筛选范围内各门店的环境项目现状",
  },
  stores: { title: "门店", href: "/stores", icon: Store, description: "浏览当前筛选范围内的门店主数据" },
  devUi: { title: "UI Lab", href: "/dev/ui", icon: LayoutDashboard, showDashboardHeader: false },
} satisfies Record<string, NavigationItem>;

export function getDashboardRoute(pathname: string): NavigationItem | undefined {
  return Object.values(routes).find((route) => route.href === pathname);
}

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
