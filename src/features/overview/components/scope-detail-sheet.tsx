"use client"

import { useEffect, useRef } from "react"
import { DetailHeader } from "@/components/shared/detail-header"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { OverviewScopeDetail } from "@/data/contracts/overview"
import { DimensionScoreAccordion } from "./dimension-score-accordion"
import { OverviewScoreRateSummary } from "./management-summary"

export type OverviewSheetDetail = { kind: "scope"; value: OverviewScopeDetail }

function scopeSubtitle(detail: OverviewScopeDetail) {
  return `${{ REGION: "区域", AREA: "小区", STORE: "门店" }[detail.level]}：${detail.label}`
}

export function ScopeSheet({ detail, currentPeriodLabel, comparisonPeriodLabel }: { detail: OverviewScopeDetail; currentPeriodLabel?: string; comparisonPeriodLabel?: string }) {
  return <>
    <DetailHeader title="得分详情" subtitle={scopeSubtitle(detail)}
      resultLabel={currentPeriodLabel && comparisonPeriodLabel ? "统计周期" : undefined}
      result={currentPeriodLabel && comparisonPeriodLabel ? <div className="space-y-1 text-sm text-muted-foreground"><p>当前期：{currentPeriodLabel}</p><p>比较期：{comparisonPeriodLabel}</p></div> : undefined}
    />
    <div className="space-y-4 px-4 pb-4">
      <section className="space-y-4" data-testid="scope-sparkline">
        <OverviewScoreRateSummary headingLevel={3} scoreRate={detail.score} monthlyDelta={detail.monthlyDelta} history={detail.monthlyHistory} />
      </section>
      <div>
        <DimensionScoreAccordion headingLevel={3} scores={detail.dimensionScores} storeCount={detail.storeCount} showAverage={detail.level !== "STORE"} identity={detail.id} />
      </div>
    </div>
  </>
}

export function ScopeDetailSheet({ detail, onClose, returnFocusTarget, currentPeriodLabel, comparisonPeriodLabel }: { detail: OverviewSheetDetail | null; onClose: () => void; returnFocusTarget: HTMLElement | null; currentPeriodLabel?: string; comparisonPeriodLabel?: string }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }) }, [detail?.value.id])
  return <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent mobileWidth="full" ref={contentRef} tabIndex={-1} className="overflow-y-auto outline-none"
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        returnFocusRef.current = returnFocusTarget
        contentRef.current?.focus()
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (returnFocusRef.current?.isConnected && !returnFocusRef.current.closest("[inert]")) returnFocusRef.current.focus()
      }}
    >{detail ? <ScopeSheet detail={detail.value} currentPeriodLabel={currentPeriodLabel} comparisonPeriodLabel={comparisonPeriodLabel} /> : null}</SheetContent>
  </Sheet>
}
