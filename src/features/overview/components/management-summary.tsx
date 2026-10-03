"use client"

import { formatOverviewRate, ScoreChange } from "./score-change"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/shared/animated-number"
import { OverviewSectionHeader } from "./overview-section-header"
import type { OverviewHistoryPoint, OverviewResult } from "@/data/contracts/overview"
import { ChangeRankingPodium } from "./change-ranking-podium"
import { OverviewMonthlyTrendChart } from "./overview-charts"

export function OverviewScoreRateSummary({ scoreRate, monthlyDelta, history, showSparseTicks = false }: {
  scoreRate: number | null
  monthlyDelta: number | null
  history: readonly OverviewHistoryPoint[]
  showSparseTicks?: boolean
}) {
  return <>
    <OverviewSectionHeader title="综合得分率" description="综合得分率 = 当前获得得分 ÷ 总指标数量 × 100%。所有正式评分指标等权；缺失、无效或不完整数据按 0/1 计分。" className="px-4 py-4 sm:px-5" />
    <CardContent className="min-w-0 p-4 pt-0 sm:p-5 sm:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" data-testid="score-rate-summary">
        <strong className="text-5xl tracking-[-0.06em] tabular-nums"><AnimatedNumber value={scoreRate} formatter={(value) => `${formatOverviewRate(value)}%`} /></strong>
        <p className="text-sm text-muted-foreground">较上月 <ScoreChange value={monthlyDelta} suffix="%" className="ml-1 font-medium" /></p>
      </div>
      <OverviewMonthlyTrendChart history={history} showSparseTicks={showSparseTicks} showAsRate />
    </CardContent>
  </>
}

export function ManagementSummary({ hero, onSelect }: { hero: OverviewResult["hero"]; onSelect?: (id: string) => void }) {
  return (
    <div className="@container/overview-summary">
    <div className="grid min-w-0 gap-6 @min-[44rem]/overview-summary:grid-cols-2 @min-[60rem]/overview-summary:grid-cols-3" data-testid="management-summary">
      <Card className="min-w-0 gap-0 py-0 shadow-none @min-[44rem]/overview-summary:col-span-2 @min-[60rem]/overview-summary:col-span-1">
        <OverviewScoreRateSummary scoreRate={hero.overallScore} monthlyDelta={hero.monthlyDelta} history={hero.monthlyScoreHistory} />
      </Card>
      {([
        ["小区变化排名", hero.improvingRanking.areas, hero.decliningRanking.areas],
        ["门店变化排名", hero.improvingRanking.stores, hero.decliningRanking.stores],
      ] as const).map(([title, improving, declining]) => (
        <Card key={title} className="min-w-0 gap-0 py-0 shadow-none">
          <OverviewSectionHeader title={title} description="按较上期得分率变化排序，上方展示增加或持平的前三名，下方展示下降或持平的前三名。同一对象不重复出现，持平时优先进入上方。数值单位为百分点。" className="px-4 py-4 sm:px-5" />
          <CardContent className="min-w-0 p-4 pt-0 sm:p-5 sm:pt-0">
            <ChangeRankingPodium improving={improving} declining={declining} onSelect={onSelect} />
          </CardContent>
        </Card>
      ))}
    </div>
    </div>
  )
}
