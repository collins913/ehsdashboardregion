"use client"

import { cn } from "@/lib/utils"
import { useId } from "react"
import { Info } from "lucide-react"
import { DetailAccordion, DetailAccordionItem, detailAccordionSummaryInsetClassName } from "@/components/shared/detail-accordion"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OverviewDimensionScore, OverviewDimensionItemScore, OverviewMetricId } from "@/data/contracts/overview"
import { formatOverviewScore, ScoreChange } from "./score-change"

const numericColumnsClassName = "grid shrink-0 whitespace-nowrap grid-cols-[var(--dimension-score-width)_7rem] gap-2 text-center"

const dimensionLabels = { PERFORMANCE: "KPI", TAKE_CHARGE: "目标", CERTIFICATES: "证件", ENVIRONMENT: "环境" }
const itemLabels: Record<OverviewMetricId, string> = {
  TRAINING: "培训", DRILL: "演练", ACTION_CLOSURE_RATE: "行动项关闭率", INSPECTION: "检查", ASTM_INCIDENT: "ASTM 事件",
  TAKE_CHARGE_CLOSE_RATE: "关闭率", SUBMISSIONS_PER_CAPITA_YTD: "今年人均提交数", PARTICIPATION_RATE_YTD: "今年参与率",
  CERTIFICATE_SAFETY_HEALTH: "安全健康", CERTIFICATE_FIRST_AID: "急救员", CERTIFICATE_SPECIAL_WORK: "特种作业", CERTIFICATE_SAFE_DRIVING: "安全驾驶",
}

type Points = Pick<OverviewDimensionItemScore, "earnedPoints" | "totalPoints" | "averageEarnedPoints" | "averageTotalPoints">

function currentPoints(score: Points, average = false) {
  const earned = average ? score.averageEarnedPoints : score.earnedPoints
  const total = average ? score.averageTotalPoints : score.totalPoints
  return total === null || total === 0 || earned === null ? "—" : `${formatOverviewScore(earned)}/${formatOverviewScore(total)}`
}

function ItemPoints({ score, average, label }: { score: Points; average: boolean; label: string }) {
  if (!average) return currentPoints(score)
  return <HoverCard openDelay={125} closeDelay={100}>
    <HoverCardTrigger asChild>
      <button type="button" aria-label={`${label}得分说明`} className="rounded-sm tabular-nums hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {currentPoints(score, true)}
      </button>
    </HoverCardTrigger>
    <HoverCardContent align="end">{label}总分：{currentPoints(score)}</HoverCardContent>
  </HoverCard>
}

export function DimensionScoreAccordion({ scores, storeCount, showAverage, identity, headingLevel = 2 }: {
  scores: readonly OverviewDimensionScore[]
  storeCount: number
  showAverage: boolean
  identity: string
  headingLevel?: 2 | 3
}) {
  const titleId = useId()
  const Heading = headingLevel === 3 ? "h3" : "h2"
  return (
      <section aria-labelledby={titleId} className={headingLevel === 2 ? "@container/dimension-score [--dimension-score-width:4rem] flex min-h-0 flex-1 flex-col" : "@container/dimension-score [--dimension-score-width:4rem]"}>
        <Heading id={titleId} className={headingLevel === 3 ? "mb-4 text-sm font-medium tracking-tight" : "mb-6 text-lg font-semibold tracking-tight"}>
          {showAverage ? <HoverCard openDelay={125} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button type="button" aria-label="维度得分说明" className="inline-flex items-center gap-1.5 rounded-sm text-left hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                维度得分<Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="space-y-2">
              <p>每店均分 = 当前范围总得分 ÷ 门店数；“/”后的数值为每店指标数量。当前范围共 {storeCount} 家门店。缺失、无效或不完整数据计 0 分，仍计入指标数量。</p>
              <div>{scores.filter((dimension) => dimension.id !== "ENVIRONMENT").map((dimension) => <p key={dimension.id}>{dimensionLabels[dimension.id]}：总分 {currentPoints(dimension)}</p>)}</div>
              <p>变化 = 本月每店均分 − 上月每店均分，单位为分。</p>
            </HoverCardContent>
          </HoverCard> : "维度得分"}
        </Heading>
        <div className={headingLevel === 2 ? "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] @min-[320px]/dimension-score:[--dimension-score-width:5rem]" : "min-w-0 @min-[320px]/dimension-score:[--dimension-score-width:5rem]"}>
        <div className={cn("sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 bg-background text-xs text-muted-foreground", detailAccordionSummaryInsetClassName)}>
          <span>维度</span><span className={numericColumnsClassName}><span>{showAverage ? "每店均分" : "当前得分"}</span><span>得分变化（分）</span></span>
        </div>
        <DetailAccordion key={identity}>
          {scores.filter((dimension) => dimension.id !== "ENVIRONMENT").map((dimension) => <DetailAccordionItem key={dimension.id} value={dimension.id} title={dimensionLabels[dimension.id]}
            disabled={dimension.items.length === 0}
            summary={<span className={numericColumnsClassName}><span className="tabular-nums">{currentPoints(dimension, showAverage)}</span><ScoreChange value={dimension.delta} suffix="" /></span>}
          >
            <div className={cn(detailAccordionSummaryInsetClassName, "min-w-0 [&>[data-slot=table-container]]:overflow-x-clip")}>
            <Table className="table-fixed" aria-label={`${dimensionLabels[dimension.id]}小维度得分`}>
              <colgroup>
                <col />
                {/* The score cell includes the same 8px gap as the summary grid. */}
                <col className="w-[calc(var(--dimension-score-width)+0.5rem)]" />
                <col className="w-28" />
              </colgroup>
              <TableHeader className="sr-only"><TableRow><TableHead>指标</TableHead><TableHead className="text-center">{showAverage ? "每店均分" : "当前得分"}</TableHead><TableHead className="text-center">得分变化（分）</TableHead></TableRow></TableHeader>
              <TableBody>{dimension.items.map((item) => <TableRow key={item.id}>
                <TableCell className="whitespace-normal font-medium">{itemLabels[item.id]}</TableCell>
                <TableCell className="pl-0 pr-2 text-center tabular-nums"><ItemPoints score={item} average={showAverage} label={itemLabels[item.id]} /></TableCell>
                <TableCell className="px-0 text-center"><ScoreChange value={item.delta} suffix="" /></TableCell>
              </TableRow>)}</TableBody>
            </Table>
            </div>
          </DetailAccordionItem>)}
        </DetailAccordion>
        </div>
        {scores.some((dimension) => dimension.id === "ENVIRONMENT") ? <p className="mt-4 text-xs text-muted-foreground">环境未纳入评分</p> : null}
      </section>
  )
}
