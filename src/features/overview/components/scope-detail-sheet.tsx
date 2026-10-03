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

export function ScopeSheet({ detail, currentPeriodLabel, comparisonLabel }: { detail: OverviewScopeDetail; currentPeriodLabel: string; comparisonLabel: string }) {
  return <>
    <div className="border-b py-4 sm:px-1"><DetailHeader title="得分详情" subtitle={scopeSubtitle(detail)} /></div>
    <div className="space-y-5 pb-5">
      <p className="px-4 text-xs text-muted-foreground sm:px-5">当前期：{currentPeriodLabel} · {comparisonLabel}</p>
      <section data-testid="scope-sparkline">
        <OverviewScoreRateSummary scoreRate={detail.score} monthlyDelta={detail.monthlyDelta} history={detail.monthlyHistory} showSparseTicks />
      </section>
      <div className="px-4 sm:px-5">
        <DimensionScoreAccordion scores={detail.dimensionScores} storeCount={detail.storeCount} showAverage={detail.level !== "STORE"} identity={detail.id} comparisonLabel={comparisonLabel} />
      </div>
    </div>
  </>
}

export function ScopeDetailSheet({ detail, onClose, currentPeriodLabel, comparisonLabel, returnFocusTarget }: { detail: OverviewSheetDetail | null; onClose: () => void; currentPeriodLabel: string; comparisonLabel: string; returnFocusTarget: HTMLElement | null }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }) }, [detail?.value.id])
  return <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent ref={contentRef} tabIndex={-1} className="overflow-y-auto outline-none"
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        returnFocusRef.current = returnFocusTarget
        contentRef.current?.focus()
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (returnFocusRef.current?.isConnected && !returnFocusRef.current.closest("[inert]")) returnFocusRef.current.focus()
      }}
    >{detail ? <ScopeSheet detail={detail.value} currentPeriodLabel={currentPeriodLabel} comparisonLabel={comparisonLabel} /> : null}</SheetContent>
  </Sheet>
}
