import { Card, CardContent } from "@/components/ui/card"
import type { OverviewDimensionScore } from "@/data/contracts/overview"
import { DimensionScoreAccordion } from "./dimension-score-accordion"

export function DimensionAnalysis({ scores, storeCount, identity, comparisonLabel }: {
  scores: readonly OverviewDimensionScore[]
  storeCount: number
  identity: string
  comparisonLabel: string
}) {
  return <Card className="gap-3 py-5 shadow-none">
    <CardContent className="px-5 sm:px-6">
      <DimensionScoreAccordion scores={scores} storeCount={storeCount} showAverage={storeCount > 1} identity={identity} comparisonLabel={comparisonLabel} />
    </CardContent>
  </Card>
}
