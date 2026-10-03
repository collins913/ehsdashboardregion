"use client"

import { useId } from "react"
import { Info } from "lucide-react"
import { DetailAccordion, DetailAccordionItem } from "@/components/shared/detail-accordion"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OverviewDimensionScore, OverviewDimensionItemScore, OverviewMetricId } from "@/data/contracts/overview"
import { formatOverviewScore, ScoreChange } from "./score-change"

const dimensionLabels = { PERFORMANCE: "KPI", TAKE_CHARGE: "目标", CERTIFICATES: "证件", ENVIRONMENT: "环境" }
const itemLabels: Record<OverviewMetricId, string> = {
  TRAINING: "培训", DRILL: "演练", ACTION_CLOSURE_RATE: "行动项关闭率", INSPECTION: "检查", ASTM_INCIDENT: "ASTM 事件",
  TAKE_CHARGE_CLOSE_RATE: "关闭率", AVERAGE_SUBMISSIONS_YTD: "今年平均提交数", PARTICIPATION_RATE_YTD: "今年参与率",
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

export function DimensionScoreAccordion({ scores, storeCount, showAverage, identity, comparisonLabel }: {
  scores: readonly OverviewDimensionScore[]
  storeCount: number
  showAverage: boolean
  identity: string
  comparisonLabel: string
}) {
  const titleId = useId()
  return (
      <section aria-labelledby={titleId}>
        <h3 id={titleId} className="mb-3 text-lg font-semibold tracking-tight">
          {showAverage ? <HoverCard openDelay={125} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button type="button" aria-label="维度得分说明" className="inline-flex items-center gap-1.5 rounded-sm text-left hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                维度得分<Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="space-y-2">
              <p>每店均分 = 当前范围总得分 ÷ 门店数，分母为每店指标数量。当前范围共 {storeCount} 家门店。得分和变化保留一位小数，整数不补零；得分率显示整数百分比。缺失、无效或不完整数据计 0 分，仍保留其指标数量；环境未纳入评分。</p>
              <div>{scores.map((dimension) => <p key={dimension.id}>{dimensionLabels[dimension.id]}：{dimension.id === "ENVIRONMENT" ? "未纳入评分" : `总分 ${currentPoints(dimension)}`}</p>)}</div>
              <p>变化为得分率差值，{comparisonLabel}，单位为百分点。</p>
            </HoverCardContent>
          </HoverCard> : "维度得分"}
        </h3>
        <div className="flex items-center justify-between gap-2 pr-8 text-xs text-muted-foreground">
          <span>维度</span><span className="grid grid-cols-[5rem_5rem] gap-2 text-center"><span>{showAverage ? "每店均分" : "当前得分"}</span><span>变化（pp）</span></span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{comparisonLabel}</p>
        <DetailAccordion key={identity}>
          {scores.map((dimension) => <DetailAccordionItem key={dimension.id} value={dimension.id} title={dimensionLabels[dimension.id]}
            disabled={dimension.items.length === 0}
            summary={<span className="grid shrink-0 grid-cols-[5rem_5rem] gap-2 text-center">{dimension.id === "ENVIRONMENT" ? <span className="col-span-2 text-xs text-muted-foreground">未纳入评分</span> : <><span className="tabular-nums">{currentPoints(dimension, showAverage)}</span><ScoreChange value={dimension.delta} /></>}</span>}
          >
            <div className="pr-8">
            <Table className="table-fixed" aria-label={`${dimensionLabels[dimension.id]}小维度得分`}>
              <colgroup>
                <col />
                {/* 5rem score column plus the same gap-2 used by the summary. */}
                <col className="w-22" />
                <col className="w-20" />
              </colgroup>
              <TableHeader className="sr-only"><TableRow><TableHead>指标</TableHead><TableHead className="text-center">{showAverage ? "每店均分" : "当前得分"}</TableHead><TableHead className="text-center">变化（pp）</TableHead></TableRow></TableHeader>
              <TableBody>{dimension.items.map((item) => <TableRow key={item.id}>
                <TableCell className="whitespace-normal font-medium">{itemLabels[item.id]}</TableCell>
                <TableCell className="pl-0 pr-2 text-center tabular-nums"><ItemPoints score={item} average={showAverage} label={itemLabels[item.id]} /></TableCell>
                <TableCell className="px-0 text-center"><ScoreChange value={item.delta} /></TableCell>
              </TableRow>)}</TableBody>
            </Table>
            </div>
          </DetailAccordionItem>)}
        </DetailAccordion>
      </section>
  )
}
