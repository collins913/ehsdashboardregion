"use client"

import type { ReactNode } from "react"

import { formatOverviewRate, ScoreChange } from "./score-change"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/shared/animated-number"
import { OverviewSectionHeader } from "./overview-section-header"
import type { OverviewHistoryPoint, OverviewResult } from "@/data/contracts/overview"
import { ChangeRankingList } from "./change-ranking-list"
import { OverviewMonthlyTrendChart } from "./overview-charts"

export function OverviewScoreRateSummary({ scoreRate, monthlyDelta, history, headingLevel = 2, fillHeight = false }: {
  scoreRate: number | null
  monthlyDelta: number | null
  history: readonly OverviewHistoryPoint[]
  headingLevel?: 2 | 3
  fillHeight?: boolean
}) {
  return <>
    <OverviewSectionHeader headingLevel={headingLevel} title="综合得分率" description={`${headingLevel === 2 ? "本月得分率，不随周期筛选变化。" : "所选周期得分率。"}综合得分率 = 当前获得得分 ÷ 总指标数量 × 100%。所有正式评分指标等权；缺失、无效或不完整数据按 0/1 计分。`} className={headingLevel === 3 ? "px-0" : undefined} />
    <CardContent className={headingLevel === 3 ? "min-w-0 px-0" : fillHeight ? "flex min-h-0 min-w-0 flex-1 flex-col justify-start" : "min-w-0"}>
      <div className="shrink-0 space-y-2" data-testid="score-rate-summary">
        <strong className={headingLevel === 3 ? "block text-2xl font-semibold tracking-tight tabular-nums" : "block text-4xl font-semibold tracking-tight tabular-nums"}><AnimatedNumber value={scoreRate} formatter={(value) => `${formatOverviewRate(value)}%`} /></strong>
        <p className="text-sm text-muted-foreground">{monthlyDelta === null ? "暂无月度比较" : "较上月"}{monthlyDelta !== null ? <ScoreChange value={monthlyDelta} className="ml-2 text-sm font-medium" /> : null}</p>
      </div>
        <OverviewMonthlyTrendChart history={history} showAsRate fillHeight={fillHeight && headingLevel === 2} />
    </CardContent>
  </>
}

export function ManagementSummary({ hero, comparisonLabel, onSelect, scoreDetail, comparison }: { hero: OverviewResult["hero"]; comparisonLabel: string; onSelect?: (id: string) => void; scoreDetail?: ReactNode; comparison?: ReactNode }) {
  return (
    <div className="@container/overview-summary">
    <div className="grid min-w-0 gap-6 @min-[60rem]/overview-summary:grid-cols-3" data-testid="management-summary">
      <Card className="min-w-0">
        <OverviewScoreRateSummary scoreRate={hero.overallScore} monthlyDelta={hero.monthlyDelta} history={hero.monthlyScoreHistory} fillHeight />
      </Card>
      {([
        ["小区变化排名", hero.improvingRanking.areas, hero.decliningRanking.areas],
        ["门店变化排名", hero.improvingRanking.stores, hero.decliningRanking.stores],
      ] as const).map(([title, improving, declining]) => (
        <Card key={title} className="min-w-0">
          <OverviewSectionHeader title={title} description={`${comparisonLabel}，按得分率变化排序。变化 = 当前得分率 − 上一个自然月得分率，使用 % 标记，属于差值而非相对增长率。提升包含增加或持平，退步包含下降或持平；同一对象不重复出现，持平时优先进入提升。`} />
          <CardContent className="min-w-0">
            <ChangeRankingList improving={improving} declining={declining} onSelect={onSelect} />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="mt-6 grid min-w-0 items-stretch gap-6 @min-[60rem]/overview-summary:grid-cols-3 @min-[60rem]/overview-summary:grid-rows-[clamp(28rem,44vh,32rem)] @min-[60rem]/overview-summary:[&>:first-child]:col-span-2" data-testid="overview-analysis-row">
      {comparison}
      {scoreDetail}
    </div>
    </div>
  )
}
