"use client"

import { useCallback, useState } from "react"
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback"
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator"
import { PageContainer } from "@/components/shared/page-container"
import type { OverviewQuery, OverviewResult, OverviewScopeDetail } from "@/data/contracts/overview"
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider"
import { useLatestAsyncQuery, type AsyncQueryState } from "@/hooks/use-latest-async-query"
import { AttentionMatrix } from "./components/attention-matrix"
import { DimensionAnalysis } from "./components/dimension-analysis"
import { ManagementSummary } from "./components/management-summary"
import { ScopeComparison } from "./components/scope-comparison"
import { ScopeDetailSheet, type OverviewSheetDetail } from "./components/scope-detail-sheet"

export type OverviewQueryAction = (input: {
  referenceDateIso: string
  query: OverviewQuery
}) => Promise<OverviewResult>

export function getOverviewPresentation(state: AsyncQueryState<OverviewResult>) {
  if (state.status === "SUCCESS") return { result: state.data, semanticKey: state.resolved.key, refreshing: false }
  if (state.status === "LOADING" && state.resolved) return { result: state.resolved.data, semanticKey: state.resolved.key, refreshing: true }
  return null
}

export function OverviewContent({ result, semanticKey = "", refreshing = false }: { result: OverviewResult; semanticKey?: string; refreshing?: boolean }) {
  const [sheetDetail, setSheetDetail] = useState<OverviewSheetDetail | null>(null)
  const openScope = useCallback((id: string) => {
    const detail = result.scopeDetails.find((item) => item.id === id)
    if (detail) setSheetDetail({ kind: "scope", value: detail })
  }, [result.scopeDetails])
  return (
    <>
      <PageContainer className="py-5 lg:py-6">
        <div className="relative space-y-5" aria-busy={refreshing || undefined}>
          <AnalyticsRefreshIndicator refreshing={refreshing} />
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">{result.scopeLabel}</span><span className="text-xs text-muted-foreground" title={result.periodNotice}>{result.periodNotice}</span></div>
          <p className="text-xs text-muted-foreground">对比 {result.previousPeriodLabel} · {result.scoreRuleVersion}</p>
          </div>

        <ManagementSummary hero={result.hero} onSelect={openScope} />
        <AttentionMatrix matrix={result.attentionMatrix} onSelect={openScope} />
        <DimensionAnalysis scores={result.dimensionScores} storeCount={result.storeCount} identity={semanticKey} />
        <ScopeComparison comparisons={result.comparisons} onSelect={openScope} semanticKey={semanticKey} />
        </div>
      </PageContainer>
      <ScopeDetailSheet detail={sheetDetail} onClose={() => setSheetDetail(null)} />
    </>
  )
}

export function OverviewPage({ queryOverview }: { queryOverview: OverviewQueryAction }) {
  const { filterContext, referenceDateIso, state } = useGlobalFilters()
  const queryKey = filterContext ? JSON.stringify([referenceDateIso, filterContext, state.period.mode]) : null
  const load = useCallback(() => queryOverview({ referenceDateIso, query: { context: filterContext! } }),
  [filterContext, queryOverview, referenceDateIso, state.period.mode])
  const query = useLatestAsyncQuery(queryKey, filterContext ? load : null)

  if (query.status === "IDLE") return <PageContainer><div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">当前筛选条件尚不能生成 Overview 数据。</div></PageContainer>
  if (query.status === "ERROR") return <PageContainer><AsyncQueryFeedback status="ERROR" /></PageContainer>
  const presentation = getOverviewPresentation(query)
  if (presentation === null) return <PageContainer><AsyncQueryFeedback status="LOADING" /></PageContainer>
  return <OverviewContent result={presentation.result} semanticKey={presentation.semanticKey} refreshing={presentation.refreshing} />
}
