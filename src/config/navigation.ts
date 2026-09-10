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

export const applicationName = "EHS Dashboard";

export const navigationLabels = {
  performance: "Performance",
  riskAndCompliance: "Risk & Compliance",
} as const;

export const routes = {
  overview: { title: "Overview", href: "/overview", icon: LayoutDashboard },
  performanceKpi: {
    title: "KPI",
    href: "/performance/kpi",
    icon: Gauge,
    section: navigationLabels.performance,
  },
  performanceGoals: {
    title: "Goals",
    href: "/performance/goals",
    icon: Target,
    section: navigationLabels.performance,
  },
  riskEvents: {
    title: "Events",
    href: "/risk/events",
    icon: FileText,
    section: navigationLabels.riskAndCompliance,
  },
  riskActions: {
    title: "Actions",
    href: "/risk/actions",
    icon: ListChecks,
    section: navigationLabels.riskAndCompliance,
  },
  riskCertificates: {
    title: "Certificates",
    href: "/risk/certificates",
    icon: Award,
    section: navigationLabels.riskAndCompliance,
  },
  riskEnvironment: {
    title: "Environment",
    href: "/risk/environment",
    icon: Leaf,
    section: navigationLabels.riskAndCompliance,
  },
  stores: { title: "Stores", href: "/stores", icon: Store },
} satisfies Record<string, NavigationItem>;

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
