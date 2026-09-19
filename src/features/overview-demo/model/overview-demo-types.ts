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
  topHint: string
  topIssue?: string
}

export type OverviewDemoAttentionPoint = OverviewDemoScopeComparison & {
  xPercent: number
  yPercent: number
  quadrantLabel: string
  labelVisible: boolean
}

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
  affectedAreaCount: number
  totalAreaCount: number
  topAreaShare: number
  top2AreaShare: number
  top3AreaShare: number
  areaDistribution: OverviewDemoIssueAreaDistribution[]
  affectedStores: OverviewDemoStoreIdentity[]
  conclusion: string
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
  label: string
  affectedCount: number
  affectedAreas: number
  transition: OverviewDemoTransition
}

export type OverviewDemoScopeDetail = {
  id: string
  label: string
  level: OverviewDemoScopeLevel
  conclusion: string
  score: number | null
  previousScore: number | null
  delta: number | null
  completeness: number
  benchmark: OverviewDemoBenchmark
  history: OverviewDemoHistoryPoint[]
  priorityInvestigations: OverviewDemoPriorityInvestigation[]
  dimensions: OverviewDemoDimensionView[]
  declineDrivers: OverviewDemoDriverView[]
  improvementDrivers: OverviewDemoDriverView[]
  changeSummary: {
    newIssues: OverviewDemoDriverView[]
    persistentIssues: OverviewDemoDriverView[]
    recovered: OverviewDemoDriverView[]
  }
  facts: string[]
  issues: OverviewDemoIssueView[]
}

export type OverviewDemoManagementSignal = {
  label: string
  value: string
  detail: string
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
  overallHistory: OverviewDemoHistoryPoint[]
  priorityInvestigations: OverviewDemoPriorityInvestigation[]
  attribution: OverviewDemoAttribution
  attentionMatrix: {
    averageScore: number | null
    deltaRange: number
    points: OverviewDemoAttentionPoint[]
    priorityScopes: OverviewDemoScopeComparison[]
  }
  comparisons: OverviewDemoScopeComparison[]
  dimensions: OverviewDemoDimensionView[]
  issues: OverviewDemoIssueView[]
  facts: string[]
  scopeDetails: OverviewDemoScopeDetail[]
}
