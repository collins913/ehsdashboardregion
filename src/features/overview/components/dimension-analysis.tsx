import { Card, CardContent } from "@/components/ui/card"
import type { OverviewDimensionScore } from "@/data/contracts/overview"
import { DimensionScoreAccordion } from "./dimension-score-accordion"

export function DimensionAnalysis({ scores, storeCount, identity }: {
  scores: readonly OverviewDimensionScore[]
  storeCount: number
  identity: string
}) {
  return <Card className="h-full min-h-0 min-w-0">
    <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col">
      <DimensionScoreAccordion scores={scores} storeCount={storeCount} showAverage={storeCount > 1} identity={identity} />
    </CardContent>
  </Card>
}
