"use client"

import { useEffect, useRef } from "react"
import { DetailHeader } from "@/components/shared/detail-header"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { OverviewScopeDetail } from "@/data/contracts/overview"
import { DimensionScoreAccordion } from "./dimension-score-accordion"
import { OverviewScoreRateSummary } from "./management-summary"

export type OverviewSheetDetail = { kind: "scope"; value: OverviewScopeDetail }

function scopeSubtitle(detail: OverviewScopeDetail) {
  return detail.level === "REGION" ? `区域：${detail.label}` : detail.label
}

export function ScopeSheet({ detail }: { detail: OverviewScopeDetail }) {
  return <>
    <div className="border-b py-4 sm:px-1"><DetailHeader title="得分详情" subtitle={scopeSubtitle(detail)} /></div>
    <div className="space-y-5 pb-5">
      <section data-testid="scope-sparkline">
        <OverviewScoreRateSummary scoreRate={detail.score} monthlyDelta={detail.monthlyDelta} history={detail.monthlyHistory} showSparseTicks />
      </section>
      <div className="px-4 sm:px-5">
        <DimensionScoreAccordion scores={detail.dimensionScores} storeCount={detail.storeCount} showAverage={detail.level === "AREA"} identity={detail.id} comparisonLabel="较上月" />
      </div>
    </div>
  </>
}

export function ScopeDetailSheet({ detail, onClose }: { detail: OverviewSheetDetail | null; onClose: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }) }, [detail?.value.id])
  return <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent ref={contentRef} tabIndex={-1} className="overflow-y-auto outline-none"
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        contentRef.current?.focus()
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
      }}
    >{detail ? <ScopeSheet detail={detail.value} /> : null}</SheetContent>
  </Sheet>
}
