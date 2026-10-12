"use client"
import type { QueryOutcome } from "@/data/contracts/query-result";

import { useCallback, useEffect, useRef, useState } from "react"
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback"
import { AnalyticsRefreshIndicator } from "@/components/shared/analytics-refresh-indicator"
import { PageContainer } from "@/components/shared/page-container"
import type { OverviewQuery, OverviewResult } from "@/data/contracts/overview"
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider"
import { storeScopeQueryKey } from "@/features/global-filters/global-filter-state"
import { useLatestAsyncQuery, type AsyncQueryState } from "@/hooks/use-latest-async-query"
import { AttentionMatrix } from "./components/attention-matrix"
import { DimensionAnalysis } from "./components/dimension-analysis"
import { ManagementSummary } from "./components/management-summary"
import { ScopeComparison } from "./components/scope-comparison"
import { ScopeDetailSheet } from "./components/scope-detail-sheet"

export type OverviewQueryAction = (input: {
  referenceDateIso: string
  query: OverviewQuery
}) => Promise<QueryOutcome<OverviewResult>>

export function getOverviewPresentation(state: AsyncQueryState<OverviewResult>) {
  if (state.status === "SUCCESS") return { result: state.data, semanticKey: state.resolved.key, refreshing: false }
  if (state.status === "LOADING" && state.resolved) return { result: state.resolved.data, semanticKey: state.resolved.key, refreshing: true }
  return null
}

export function OverviewContent({ result, semanticKey = "", requestedKey = semanticKey, refreshing = false }: {
  result: OverviewResult; semanticKey?: string; requestedKey?: string; refreshing?: boolean
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [selectedScope, setSelectedScope] = useState<{ id: string; key: string } | null>(null)
  useEffect(() => { setSelectedScope(null) }, [requestedKey, refreshing])
  const openScope = useCallback((id: string, trigger?: HTMLElement | null) => {
    if (!refreshing && requestedKey === semanticKey && result.scopeDetails.some((item) => item.id === id)) {
      returnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
      setSelectedScope({ id, key: semanticKey })
    }
  }, [result.scopeDetails, refreshing, requestedKey, semanticKey])
  const selectedDetail = !refreshing && requestedKey === semanticKey && selectedScope?.key === semanticKey
    ? result.scopeDetails.find((item) => item.id === selectedScope.id) ?? null : null
  const comparisonLabel = result.previousPeriodLabel === "无可比较历史" ? result.previousPeriodLabel : `比较期：${result.previousPeriodLabel}`
  return (
    <>
      <PageContainer className="py-5 lg:py-6">
        <div className="relative space-y-6" aria-busy={refreshing || undefined}>
          <AnalyticsRefreshIndicator refreshing={refreshing} />
          <div inert={refreshing || undefined} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>{result.scopeLabel}</span>{result.scopeLabel !== `已选 ${result.storeCount} 家门店` ? <span>· {result.storeCount} 家门店</span> : null}<span>· 当前期：{result.currentPeriodLabel}</span><span>· 比较期：{result.previousPeriodLabel}</span></div>
          <p className="text-xs text-muted-foreground">{result.scoreRuleVersion}</p>
          </div>
          {!result.periodNotice.startsWith("分析周期：") ? <p className="text-xs text-muted-foreground">{result.periodNotice}</p> : null}

        <ManagementSummary hero={result.hero} comparisonLabel={comparisonLabel} onSelect={openScope}
          scoreDetail={<DimensionAnalysis scores={result.dimensionScores} storeCount={result.storeCount} identity={semanticKey} />}
          comparison={<AttentionMatrix key={semanticKey} matrix={result.attentionMatrix} comparisonLabel={comparisonLabel} onSelect={openScope} selectedScopeId={result.storeCount === 1 ? result.stores[0]?.storeId : undefined} />}
        />
        <ScopeComparison comparisons={result.comparisons} onSelect={openScope} semanticKey={semanticKey} comparisonLabel={comparisonLabel} />
        </div>
        </div>
      </PageContainer>
      <ScopeDetailSheet detail={selectedDetail ? { kind: "scope", value: selectedDetail } : null} onClose={() => setSelectedScope(null)} returnFocusTarget={returnFocusRef.current}
        currentPeriodLabel={result.currentPeriodLabel} comparisonPeriodLabel={result.previousPeriodLabel} />
    </>
  )
}

export function OverviewPage({ queryOverview }: { queryOverview: OverviewQueryAction }) {
  const { storeScope, referenceDateIso } = useGlobalFilters()
  const queryKey = storeScope ? JSON.stringify([referenceDateIso, storeScopeQueryKey(storeScope)]) : null
  const load = useCallback(() => queryOverview({ referenceDateIso, query: { context: storeScope! } }),
  [storeScope, queryOverview, referenceDateIso])
  const query = useLatestAsyncQuery(queryKey, storeScope ? load : null)

  if (query.status === "IDLE") return <PageContainer><div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">当前筛选条件尚不能生成 Overview 数据。</div></PageContainer>
  if (query.status === "ERROR") return <PageContainer><AsyncQueryFeedback status="ERROR" errorCode={query.errorCode} /></PageContainer>
  const presentation = getOverviewPresentation(query)
  if (presentation === null) return <PageContainer><AsyncQueryFeedback status="LOADING" /></PageContainer>
  return <OverviewContent result={presentation.result} semanticKey={presentation.semanticKey} requestedKey={queryKey!} refreshing={presentation.refreshing} />
}
