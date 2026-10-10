export type PrototypeOverviewScopeLevel = "REGION" | "AREA" | "STORE"

export type PrototypeOverviewDimensionId =
  | "PERFORMANCE"
  | "TAKE_CHARGE"
  | "CERTIFICATES"
  | "ENVIRONMENT"
export type PrototypeOverviewScoredDimensionId = Exclude<PrototypeOverviewDimensionId, "ENVIRONMENT">

export type PrototypeOverviewScoredItemId =
  | "training"
  | "drill"
  | "actions"
  | "inspections"
  | "events"
  | "closeRate"
  | "submissionsPerCapitaYtd"
  | "participationRateYtd"
  | "certificateSafetyHealth"
  | "certificateFirstAid"
  | "certificateSpecialWork"
  | "certificateSafeDriving"
export type PrototypeOverviewItemId = PrototypeOverviewScoredItemId

export type PrototypeOverviewOutcome = "PASS" | "FAIL" | "MISSING"
export type PrototypeOverviewTransition = "NEW_ISSUE" | "PERSISTENT_ISSUE" | "RECOVERED" | "STABLE_GOOD" | "MISSING"
export type PrototypeOverviewImpactDirection = "NEGATIVE" | "POSITIVE" | "NEUTRAL"

export type PrototypeOverviewScoredItemDefinition = {
  id: PrototypeOverviewItemId
  label: string
  dimension: PrototypeOverviewScoredDimensionId
  issueLabel: string
  route: string
}

export type PrototypeOverviewStoreSnapshot = {
  storeId: string
  outcomes: Record<PrototypeOverviewItemId, PrototypeOverviewOutcome>
  operationalFacts: PrototypeOverviewOperationalFacts
}

export type PrototypeOverviewOperationalFacts = {
  openActions: number
  openEvents: number
  submissionTotal: number
}

export type PrototypeOverviewPeriodSnapshot = {
  periodLabel: string
  stores: readonly PrototypeOverviewStoreSnapshot[]
}

export type PrototypeOverviewScore = {
  score: number | null
  passedCount: number
  availableCount: number
  expectedCount: number
  completeness: number
}

export type PrototypeOverviewDimensionScore = PrototypeOverviewScore & {
  id: PrototypeOverviewScoredDimensionId
  label: string
  failedCount: number
}

export type PrototypeOverviewHistoryPoint = { periodLabel: string; score: number | null }
export type PrototypeOverviewStoreIdentity = { storeId: string; storeLabel: string; area: string }

export type PrototypeOverviewAttributionItem = {
  metricKey: PrototypeOverviewItemId
  label: string
  dimension: PrototypeOverviewScoredDimensionId
  transition: PrototypeOverviewTransition
  previousResult: PrototypeOverviewOutcome
  currentResult: PrototypeOverviewOutcome
  affectedStores: PrototypeOverviewStoreIdentity[]
  affectedAreas: string[]
  impactDirection: PrototypeOverviewImpactDirection
}

export type PrototypeOverviewAttribution = {
  newIssues: PrototypeOverviewAttributionItem[]
  persistentIssues: PrototypeOverviewAttributionItem[]
  recovered: PrototypeOverviewAttributionItem[]
  stableGood: PrototypeOverviewAttributionItem[]
  missing: PrototypeOverviewAttributionItem[]
  declineDrivers: PrototypeOverviewAttributionItem[]
  improvementDrivers: PrototypeOverviewAttributionItem[]
}

export type PrototypeOverviewBenchmark = {
  parentLabel: string
  parentAverage: number | null
  rank: number | null
  rankLabel: string
  isTied: boolean
  total: number
}

export type PrototypeOverviewScopeComparison = {
  id: string
  rank: number | null
  label: string
  level: PrototypeOverviewScopeLevel
  score: number | null
  previousScore: number | null
  delta: number | null
  completeness: number
  storeCount: number
  mainChange: string
  currentConcern: string
  rankLabel?: string
  isTied?: boolean
}

export type PrototypeOverviewScopeScoreComparison = PrototypeOverviewScopeComparison & {
  earnedPoints: number | null
  totalPoints: number
  pointDelta: number | null
}

export type PrototypeOverviewAttentionPoint = PrototypeOverviewScopeComparison & {
  quadrantLabel: string
  labelVisible: boolean
}

export type PrototypeOverviewAttentionGroup = {
  id: string
  score: number
  delta: number
  level: PrototypeOverviewScopeLevel
  count: number
  members: PrototypeOverviewAttentionPoint[]
}

export type PrototypeOverviewChartDomain = readonly [number, number]

export type PrototypeOverviewDimensionMetricView = {
  id: PrototypeOverviewItemId
  label: string
  passCount: number
  failCount: number
  availableCount: number
  totalCount: number
  previousPassCount: number
  passDelta: number
  newIssueCount: number
  persistentIssueCount: number
  recoveredCount: number
}

export type PrototypeOverviewDimensionView = {
  id: PrototypeOverviewDimensionId
  label: string
  score: number | null
  previousScore: number | null
  delta: number | null
  completeness: number | null
  passStores: number | null
  totalStores: number
  failCount: number | null
  newIssueCount: number | null
  recoveredCount: number | null
  primaryDrag: string
  primaryImprovement: string
  explanation: string
  items: PrototypeOverviewDimensionMetricView[]
  isTbd: boolean
}

export type PrototypeOverviewIssueAreaDistribution = { area: string; count: number; share: number }
export type PrototypeOverviewIssueView = {
  id: PrototypeOverviewItemId
  label: string
  route: string
  currentCount: number
  previousCount: number
  delta: number
  newIssueCount: number
  persistentIssueCount: number
  persistenceRate: number | null
  recoveredCount: number
  lifecycle: {
    current: number
    new: number
    persistent: number
    previous: number
    recovered: number
    delta: number
  }
  affectedAreaCount: number
  totalAreaCount: number
  topAreaShare: number
  top2AreaShare: number
  top3AreaShare: number
  areaDistribution: PrototypeOverviewIssueAreaDistribution[]
  affectedStores: PrototypeOverviewStoreIdentity[]
  conclusion: string
}

export type PrototypeOverviewScopeChangeSummary = {
  mainChange: string
  currentConcern: string
  changeKind: "IMPROVEMENT" | "DECLINE" | "STABLE" | "UNAVAILABLE"
}

export type PrototypeOverviewPriorityInvestigation = {
  issueKey: PrototypeOverviewItemId
  label: string
  dimension: PrototypeOverviewScoredDimensionId
  reason: string
  affectedStores: number
  newCount: number
  persistentCount: number
  routeTarget: string
}

export type PrototypeOverviewDriverView = {
  categoryKey: PrototypeOverviewItemId
  categoryLabel: string
  status: "异常" | "未达成" | "正常" | "达成"
  affectedCount: number
  affectedAreas: number
  transition: PrototypeOverviewTransition
}

export type PrototypeOverviewDiagnosticIssue = {
  issueKey: PrototypeOverviewItemId
  categoryKey: PrototypeOverviewItemId
  categoryLabel: string
  status: "异常" | "未达成"
  scoreImpact: number | null
  newCount: number
  persistentCount: number
  recoveredCount: number
  isDeclineDriver: boolean
  isSuggestedFirst: boolean
  affectedStores: number
  routeTarget: string
}

export type PrototypeOverviewDiagnosticDimension = {
  dimensionKey: PrototypeOverviewDimensionId
  dimensionLabel: string
  score: number | null
  delta: number | null
  isPriority: boolean
  issues: PrototypeOverviewDiagnosticIssue[]
}

export type PrototypeOverviewScopeChangeItem = {
  scopeId: string
  scopeName: string
  currentScore: number | null
  delta: number
  completeness: number
}

export type PrototypeOverviewManagementFact = {
  key: "OPEN_ACTIONS" | "OPEN_EVENTS" | "SUBMISSION_TOTAL"
  label: string
  value: number
}

export type PrototypeOverviewScopeItemScore = {
  id: PrototypeOverviewItemId
  earnedPoints: number | null
  totalPoints: number | null
  averageEarnedPoints: number | null
  averageTotalPoints: number | null
  delta: number | null
}

export type PrototypeOverviewScopeDimensionScore = Omit<PrototypeOverviewScopeItemScore, "id"> & {
  id: PrototypeOverviewDimensionId
  items: PrototypeOverviewScopeItemScore[]
}

export type PrototypeOverviewScopeDetail = {
  id: string
  label: string
  level: PrototypeOverviewScopeLevel
  storeCount: number
  score: number | null
  previousScore: number | null
  delta: number | null
  monthlyDelta: number | null
  completeness: number
  benchmark: PrototypeOverviewBenchmark
  monthlyHistory: PrototypeOverviewHistoryPoint[]
  trendLabel: "持续改善" | "持续下降" | "近期回升" | "基本稳定"
  diagnostics: PrototypeOverviewDiagnosticDimension[]
  dimensionScores: PrototypeOverviewScopeDimensionScore[]
  changeSummary: {
    newIssues: PrototypeOverviewDriverView[]
    persistentIssues: PrototypeOverviewDriverView[]
    recovered: PrototypeOverviewDriverView[]
  }
  scopeChanges: {
    label: "小区变化" | "门店变化"
    declining: PrototypeOverviewScopeChangeItem[]
    improving: PrototypeOverviewScopeChangeItem[]
  } | null
  managementFacts: PrototypeOverviewManagementFact[]
  issues: PrototypeOverviewIssueView[]
}

export type PrototypeOverviewManagementSignal = {
  label: string
  value: string
  detail: string
}

export type PrototypeOverviewHeroScopeChange = { id: string; name: string; delta: number } | null
export type PrototypeOverviewScoreChange = {
  key: PrototypeOverviewItemId
  label: string
  deltaPoints: number
  direction: "up" | "down"
}
export type PrototypeOverviewMovementScope = {
  id: string
  name: string
  currentScore: number | null
  delta: number
  scoreChanges: PrototypeOverviewScoreChange[]
  scoreChangesUnavailable: boolean
}
export type PrototypeOverviewMovementDetail = {
  area: PrototypeOverviewMovementScope | null
  store: PrototypeOverviewMovementScope | null
}
export type PrototypeOverviewHero = {
  improvingRanking: { areas: NonNullable<PrototypeOverviewHeroScopeChange>[]; stores: NonNullable<PrototypeOverviewHeroScopeChange>[] }
  decliningRanking: { areas: NonNullable<PrototypeOverviewHeroScopeChange>[]; stores: NonNullable<PrototypeOverviewHeroScopeChange>[] }
  overallScore: number | null
  monthlyDelta: number | null
  monthlyScoreHistory: PrototypeOverviewHistoryPoint[]
  topImprovingArea: PrototypeOverviewHeroScopeChange
  topImprovingStore: PrototypeOverviewHeroScopeChange
  topDecliningArea: PrototypeOverviewHeroScopeChange
  topDecliningStore: PrototypeOverviewHeroScopeChange
  primaryScoreLoss: { label: string; affectedStores: number } | null
  systemicIssue: { label: string; affectedAreas: number; totalAreas: number; affectedStores: number } | null
}

export type PrototypeOverviewExecutiveInsight = {
  headline: string
  overallScore: number | null
  delta: number | null
  completeness: number
  storeCount: number
  lowestScope: string
  highestScope: string
  largestDecline: string
  largestImprovement: string
  topIssue: string
  systemicIssue: string
  biggestNewIssue: string
  biggestPersistentIssue: string
  primaryDeclineDriver: string
  primaryImprovementDriver: string
  attentionScope: string
  note: string
  priorityScope: PrototypeOverviewManagementSignal
  declineSignal: PrototypeOverviewManagementSignal
  systemicSignal: PrototypeOverviewManagementSignal
  improvementSignal: PrototypeOverviewManagementSignal
}

export type PrototypeOverviewResult = {
  scopeLabel: string
  scopeLevel: PrototypeOverviewScopeLevel
  currentPeriodLabel: string
  previousPeriodLabel: string
  periodNotice: string
  scoreRuleVersion: string
  executive: PrototypeOverviewExecutiveInsight
  hero: PrototypeOverviewHero
  movements: { improving: PrototypeOverviewMovementDetail; declining: PrototypeOverviewMovementDetail }
  priorityInvestigations: PrototypeOverviewPriorityInvestigation[]
  attribution: PrototypeOverviewAttribution
  attentionMatrix: {
    averageScore: number | null
    xDomain: PrototypeOverviewChartDomain
    yDomain: PrototypeOverviewChartDomain
    points: PrototypeOverviewAttentionPoint[]
    groups: PrototypeOverviewAttentionGroup[]
  }
  comparisons: PrototypeOverviewScopeScoreComparison[]
  dimensions: PrototypeOverviewDimensionView[]
  dimensionScores: PrototypeOverviewScopeDimensionScore[]
  storeCount: number
  issues: PrototypeOverviewIssueView[]
  facts: string[]
  scopeDetails: PrototypeOverviewScopeDetail[]
}
