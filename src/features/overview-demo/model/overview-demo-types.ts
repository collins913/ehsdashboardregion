export type OverviewDemoScopeLevel = "REGION" | "AREA" | "STORE"

export type OverviewDemoDimensionId =
  | "PERFORMANCE"
  | "TAKE_CHARGE"
  | "CERTIFICATES"
  | "ENVIRONMENT"
export type OverviewDemoScoredDimensionId = Exclude<OverviewDemoDimensionId, "ENVIRONMENT">

export type OverviewDemoScoredItemId =
  | "training"
  | "drill"
  | "actions"
  | "inspections"
  | "events"
  | "closeRate"
  | "averageSubmissionsYtd"
  | "participationRateYtd"
  | "certificateSafetyHealth"
  | "certificateFirstAid"
  | "certificateSpecialWork"
  | "certificateSafeDriving"
export type OverviewDemoItemId = OverviewDemoScoredItemId

export type OverviewDemoOutcome = "PASS" | "FAIL" | "MISSING"
export type OverviewDemoTransition = "NEW_ISSUE" | "PERSISTENT_ISSUE" | "RECOVERED" | "STABLE_GOOD" | "MISSING"
export type OverviewDemoImpactDirection = "NEGATIVE" | "POSITIVE" | "NEUTRAL"

export type OverviewDemoScoredItemDefinition = {
  id: OverviewDemoItemId
  label: string
  dimension: OverviewDemoScoredDimensionId
  issueLabel: string
  route: string
}

export type OverviewDemoStoreSnapshot = {
  storeId: string
  outcomes: Record<OverviewDemoItemId, OverviewDemoOutcome>
  operationalFacts: OverviewDemoOperationalFacts
}

export type OverviewDemoOperationalFacts = {
  openActions: number
  openEvents: number
  submissionTotal: number
}

export type OverviewDemoPeriodSnapshot = {
  periodLabel: string
  stores: readonly OverviewDemoStoreSnapshot[]
}

export type OverviewDemoScore = {
  score: number | null
  passedCount: number
  availableCount: number
  expectedCount: number
  completeness: number
}

export type OverviewDemoDimensionScore = OverviewDemoScore & {
  id: OverviewDemoScoredDimensionId
  label: string
  failedCount: number
}

export type OverviewDemoHistoryPoint = { periodLabel: string; score: number | null }
export type OverviewDemoStoreIdentity = { storeId: string; storeLabel: string; area: string }

export type OverviewDemoAttributionItem = {
  metricKey: OverviewDemoItemId
  label: string
  dimension: OverviewDemoScoredDimensionId
  transition: OverviewDemoTransition
  previousResult: OverviewDemoOutcome
  currentResult: OverviewDemoOutcome
  affectedStores: OverviewDemoStoreIdentity[]
  affectedAreas: string[]
  impactDirection: OverviewDemoImpactDirection
}

export type OverviewDemoAttribution = {
  newIssues: OverviewDemoAttributionItem[]
  persistentIssues: OverviewDemoAttributionItem[]
  recovered: OverviewDemoAttributionItem[]
  stableGood: OverviewDemoAttributionItem[]
  missing: OverviewDemoAttributionItem[]
  declineDrivers: OverviewDemoAttributionItem[]
  improvementDrivers: OverviewDemoAttributionItem[]
}

export type OverviewDemoBenchmark = {
  parentLabel: string
  parentAverage: number | null
  rank: number | null
  rankLabel: string
  isTied: boolean
  total: number
}

export type OverviewDemoScopeComparison = {
  id: string
  rank: number | null
  label: string
  level: "AREA" | "STORE"
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

export type OverviewDemoAttentionPoint = OverviewDemoScopeComparison & {
  quadrantLabel: string
  labelVisible: boolean
}

export type OverviewDemoChartDomain = readonly [number, number]

export type OverviewDemoDimensionMetricView = {
  id: OverviewDemoItemId
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

export type OverviewDemoDimensionView = {
  id: OverviewDemoDimensionId
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
  items: OverviewDemoDimensionMetricView[]
  isTbd: boolean
}

export type OverviewDemoIssueAreaDistribution = { area: string; count: number; share: number }
export type OverviewDemoIssueView = {
  id: OverviewDemoItemId
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
  areaDistribution: OverviewDemoIssueAreaDistribution[]
  affectedStores: OverviewDemoStoreIdentity[]
  conclusion: string
}

export type OverviewDemoScopeChangeSummary = {
  mainChange: string
  currentConcern: string
  changeKind: "IMPROVEMENT" | "DECLINE" | "STABLE" | "UNAVAILABLE"
}

export type OverviewDemoPriorityInvestigation = {
  issueKey: OverviewDemoItemId
  label: string
  dimension: OverviewDemoScoredDimensionId
  reason: string
  affectedStores: number
  newCount: number
  persistentCount: number
  routeTarget: string
}

export type OverviewDemoDriverView = {
  categoryKey: OverviewDemoItemId
  categoryLabel: string
  status: "异常" | "未达成" | "正常" | "达成"
  affectedCount: number
  affectedAreas: number
  transition: OverviewDemoTransition
}

export type OverviewDemoDiagnosticIssue = {
  issueKey: OverviewDemoItemId
  categoryKey: OverviewDemoItemId
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

export type OverviewDemoDiagnosticDimension = {
  dimensionKey: OverviewDemoDimensionId
  dimensionLabel: string
  score: number | null
  delta: number | null
  isPriority: boolean
  issues: OverviewDemoDiagnosticIssue[]
}

export type OverviewDemoScopeChangeItem = {
  scopeId: string
  scopeName: string
  currentScore: number | null
  delta: number
  completeness: number
}

export type OverviewDemoManagementFact = {
  key: "OPEN_ACTIONS" | "OPEN_EVENTS" | "SUBMISSION_TOTAL"
  label: string
  value: number
}

export type OverviewDemoScopeDetail = {
  id: string
  label: string
  level: OverviewDemoScopeLevel
  score: number | null
  previousScore: number | null
  delta: number | null
  monthlyDelta: number | null
  completeness: number
  benchmark: OverviewDemoBenchmark
  monthlyHistory: OverviewDemoHistoryPoint[]
  trendLabel: "持续改善" | "持续下降" | "近期回升" | "基本稳定"
  diagnostics: OverviewDemoDiagnosticDimension[]
  changeSummary: {
    newIssues: OverviewDemoDriverView[]
    persistentIssues: OverviewDemoDriverView[]
    recovered: OverviewDemoDriverView[]
  }
  scopeChanges: {
    label: "小区变化" | "门店变化"
    declining: OverviewDemoScopeChangeItem[]
    improving: OverviewDemoScopeChangeItem[]
  } | null
  managementFacts: OverviewDemoManagementFact[]
  issues: OverviewDemoIssueView[]
}

export type OverviewDemoManagementSignal = {
  label: string
  value: string
  detail: string
}

export type OverviewDemoHeroScopeChange = { name: string; delta: number } | null
export type OverviewDemoScoreChange = {
  key: OverviewDemoItemId
  label: string
  deltaPoints: number
  direction: "up" | "down"
}
export type OverviewDemoMovementScope = {
  id: string
  name: string
  currentScore: number | null
  delta: number
  scoreChanges: OverviewDemoScoreChange[]
  scoreChangesUnavailable: boolean
}
export type OverviewDemoMovementDetail = {
  area: OverviewDemoMovementScope | null
  store: OverviewDemoMovementScope | null
}
export type OverviewDemoHero = {
  overallScore: number | null
  monthlyDelta: number | null
  monthlyScoreHistory: OverviewDemoHistoryPoint[]
  topImprovingArea: OverviewDemoHeroScopeChange
  topImprovingStore: OverviewDemoHeroScopeChange
  topDecliningArea: OverviewDemoHeroScopeChange
  topDecliningStore: OverviewDemoHeroScopeChange
  primaryScoreLoss: { label: string; affectedStores: number } | null
  systemicIssue: { label: string; affectedAreas: number; totalAreas: number; affectedStores: number } | null
}

export type OverviewDemoExecutiveInsight = {
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
  priorityScope: OverviewDemoManagementSignal
  declineSignal: OverviewDemoManagementSignal
  systemicSignal: OverviewDemoManagementSignal
  improvementSignal: OverviewDemoManagementSignal
}

export type OverviewDemoViewModel = {
  scopeLabel: string
  scopeLevel: OverviewDemoScopeLevel
  currentPeriodLabel: string
  previousPeriodLabel: string
  periodNotice: string
  scoreRuleVersion: string
  executive: OverviewDemoExecutiveInsight
  hero: OverviewDemoHero
  movements: { improving: OverviewDemoMovementDetail; declining: OverviewDemoMovementDetail }
  priorityInvestigations: OverviewDemoPriorityInvestigation[]
  attribution: OverviewDemoAttribution
  attentionMatrix: {
    averageScore: number | null
    xDomain: OverviewDemoChartDomain
    yDomain: OverviewDemoChartDomain
    points: OverviewDemoAttentionPoint[]
  }
  comparisons: OverviewDemoScopeComparison[]
  dimensions: OverviewDemoDimensionView[]
  issues: OverviewDemoIssueView[]
  facts: string[]
  scopeDetails: OverviewDemoScopeDetail[]
}
