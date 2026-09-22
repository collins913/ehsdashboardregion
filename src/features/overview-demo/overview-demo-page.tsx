"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Database, FlaskConical, ListChecks, Store } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PageContainer } from "@/components/shared/page-container"
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider"
import { AttentionMatrix } from "./components/attention-matrix"
import { DimensionAnalysis } from "./components/dimension-analysis"
import { IssueProfile } from "./components/issue-profile"
import { ManagementSummary } from "./components/management-summary"
import { ScopeComparison } from "./components/scope-comparison"
import { ScopeDetailSheet, type OverviewDemoSheetDetail } from "./components/scope-detail-sheet"
import { WhatChanged } from "./components/what-changed"
import type { OverviewDemoIssueView, OverviewDemoViewModel } from "./model/overview-demo-types"
import { buildOverviewDemoViewModel } from "./overview-demo-view-model"

export function OverviewDemoContent({ viewModel }: { viewModel: OverviewDemoViewModel }) {
  const [sheetDetail, setSheetDetail] = useState<OverviewDemoSheetDetail | null>(null)

  function openScope(id: string) {
    const detail = viewModel.scopeDetails.find((item) => item.id === id)
    if (detail) setSheetDetail({ kind: "scope", value: detail })
  }

  function openIssue(issue: OverviewDemoIssueView) {
    setSheetDetail({ kind: "issue", value: issue })
  }

  return (
    <>
      <PageContainer className="space-y-5 py-5 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary"><FlaskConical />实验版</Badge><span className="text-sm text-muted-foreground">{viewModel.scopeLabel}</span><span className="text-xs text-muted-foreground" title={viewModel.periodNotice}>Demo 周期：{viewModel.currentPeriodLabel} · 全局周期尚未映射</span></div>
          <p className="text-xs text-muted-foreground">对比 {viewModel.previousPeriodLabel} · {viewModel.scoreRuleVersion}</p>
        </div>

        <ManagementSummary hero={viewModel.hero} movements={viewModel.movements} issues={viewModel.issues} onSelectIssue={openIssue} />

        <AttentionMatrix matrix={viewModel.attentionMatrix} onSelect={openScope} />
        <ScopeComparison title={viewModel.scopeLevel === "REGION" ? "小区表现" : "门店表现"} comparisons={viewModel.comparisons} onSelect={openScope} />

        <WhatChanged attribution={viewModel.attribution} issues={viewModel.issues} />
        <DimensionAnalysis dimensions={viewModel.dimensions} />
        <IssueProfile issues={viewModel.issues} onSelect={openIssue} />

        <section className="border-y py-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">管理事实</p><p className="mt-1 text-xs text-muted-foreground">运营事实不计入 Demo 得分。</p></div><div className="grid flex-1 gap-2 sm:grid-cols-3">{viewModel.facts.map((fact, index) => { const Icon = index === 0 ? ListChecks : index === 1 ? Store : Database; const href = index === 0 ? "/risk/actions" : index === 1 ? "/risk/events" : "/performance/kpi"; return <Link key={fact} href={href} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50"><Icon className="size-4 text-primary" /><p className="text-sm font-medium">{fact}</p></Link> })}</div></div>
        </section>
        <footer className="border-t pt-3 text-[11px] text-muted-foreground" data-testid="overview-data-footer">数据完整度 {viewModel.executive.completeness}% · 覆盖 {viewModel.executive.storeCount} 家门店 · Demo 周期 {viewModel.currentPeriodLabel} · {viewModel.scoreRuleVersion}</footer>
      </PageContainer>
      <ScopeDetailSheet detail={sheetDetail} onClose={() => setSheetDetail(null)} />
    </>
  )
}

export function OverviewDemoPage() {
  const { state, options } = useGlobalFilters()
  const viewModel = useMemo(() => buildOverviewDemoViewModel(options.stores, state), [options.stores, state])
  return <OverviewDemoContent viewModel={viewModel} />
}
