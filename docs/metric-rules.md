# EHS Dashboard — Metric & Business Rules

- Version: V1.1
- Date: 2026-09-10
- Status: Confirmed rules with explicitly identified TBD items

---

## 1. Document Responsibility

This document defines only:

- how business results are calculated;
- how KPI / Goal results are evaluated;
- how compliance rules are evaluated;
- which inputs participate in each rule.

This document does NOT define:

- page layout or interaction;
- Badge / Card / Table appearance;
- colors or icons;
- raw data schemas;
- database structure;
- source-system field mapping;
- navigation.

Related documents:

- Page behavior: `business-requirements.md`
- Input data structure: `data-contract.md`
- Status semantics and mappings: `status-dictionary.md`
- Architecture decisions: `decisions.md`

---

## 2. Common Rule Principles

### 2.1 Global Filter Scope

Except for Store Master Data, current-state Environment / Certificates V1, and Goals YTD metrics (which ignore Period), business results are evaluated within the current Global Filters scope:

- Region
- Area
- Store
- Period

The rule layer receives the already-filtered business data and does not implement UI filtering itself.

---

### 2.2 Business Logic Boundary

All calculation and evaluation logic must be implemented in centralized business-rule functions.

UI components must not independently:

- calculate KPI results;
- infer compliance;
- interpret raw Status values;
- determine expiry;
- infer missing values;
- recreate thresholds.

Conceptual flow:

Raw Data
→ Repository / Adapter
→ Rule Engine
→ Business Result
→ View Model
→ UI

---

### 2.3 Direct-source Aggregated Metrics

When a KPI or Goal value is explicitly defined as being provided directly by the source data:

- Dashboard must not recalculate it from detail records;
- detail records may be used for drill-down only;
- source representation normalization belongs in Repository / Adapter.

---

### 2.4 Percentage Representation

Application-internal percentage values use the range:

`0–100`

Examples:

- `90` = 90%
- `50` = 50%
- `97.5` = 97.5%

External sources using another representation must be normalized before entering the rule layer.

---

### 2.5 Missing / Unknown Data

Missing, null, malformed, or unknown values must never be silently converted to:

- `0`
- `No`
- `Normal`
- `Achieved`
- `Closed`

When a rule cannot safely produce a business conclusion, return:

`UNDETERMINED`

unless a module-specific rule explicitly defines another result.

---

### 2.6 Date-based Rules

Expiry rules must receive an explicit `referenceDate`.

Expiry calculation:

`expiryDate < referenceDate`
→ Expired

`expiryDate >= referenceDate`
→ Valid

Therefore, a certificate / permit remains valid on its stated Expiry Date.

Dates used for expiry evaluation should be date-only values such as:

`YYYY-MM-DD`

The rule function must not read the browser/system current time directly.

Production uses the trusted application-server clock. The business date and
month are interpreted in `Asia/Shanghai`; a client-supplied timestamp cannot
override the production business date. Mock mode retains injected dates for
deterministic tests.

This does not prevent deterministic testing because tests can inject a reference date.

---

# 3. Performance → KPI

## 3.1 Training

### V1 achievement rule

培训与检查仅评价当前 Store × Period 实际收到的记录，不要求每月有记录、不检查项目或任务清单齐全，也不要求两类记录同时存在。培训所有已有记录 completionRate = 100、检查所有已有记录 status 规范化后精确为“已完成”则达成；任一有效记录未完成则进行中。整个范围经确认完整且零记录时视为无待办，达成并计满分。已有记录必要字段为空或格式错误、来源不可用或覆盖不完整仍为未确定，并保留具体诊断。

`completionRate` and `incompletePeople` remain source-provided; do not recalculate them from person-level rows.

---

## 3.2 Drill

### Purpose

Determine whether the Store completed the required monthly Drill activity.

### Requirement

Each Store must complete at least:

`1 Drill per included month`

### Rule

For each included month:

At least one Drill exists and all Drill records are completed
→ month passes

No Drill record exists, or any Drill is incomplete
→ month fails

Period result:

All included months pass
→ `ACHIEVED`

Any included month fails
→ `NOT_ACHIEVED`

### Result Type

`PerformanceResult`

### Notes

- Drill Name is descriptive and does not participate in KPI evaluation.
- Multiple completed Drills in one month still satisfy the same monthly requirement.
- Incomplete or unavailable Drill source coverage returns `UNDETERMINED`; record absence under complete coverage returns `NOT_ACHIEVED`.
- A record is completed only when its normalized open-text Source Status exactly equals `已完成`. Other non-empty source text is incomplete; missing or empty status follows the `INCOMPLETE` / `UNDETERMINED` data-availability path.

For the monthly Overview contribution, evaluate the one included month using the same rule. Period-range KPI behavior remains governed by the existing Period contract.

---

## 3.3 Actions

### Metric

`Action Closure Rate`

### Source

Value is provided directly by the source data.

Dashboard must NOT calculate:

- Numerator
- Denominator
- Closure Rate

from Action detail records.

### Input

`Action Closure Rate: number | null`

Internal percentage range:

`0–100`

### Target

`>= 90%`

### Result

Value >= 90
→ `ACHIEVED`

Value < 90
→ `NOT_ACHIEVED`

Complete source coverage and confirmed no Action requiring correction
→ aggregate value may be `null`; result = `ACHIEVED`

Incomplete or unavailable source coverage, or an unconfirmed Period aggregate
→ `UNDETERMINED`

Display boundary:

- confirmed no-actions `null` → `无` with the same secondary status emphasis as `ACHIEVED`;
- numeric `0` → `0%`;
- `null` must never be coerced to `100` or numeric `0`;
- incomplete or unavailable data must display Data Availability instead of `无`.

### Result Type

`PerformanceResult`

---

## 3.4 Inspections

### V1 achievement rule

培训与检查仅评价当前 Store × Period 实际收到的记录，不要求每月有记录、不检查项目或任务清单齐全，也不要求两类记录同时存在。培训所有已有记录 completionRate = 100、检查所有已有记录 status 规范化后精确为“已完成”则达成；任一有效记录未完成则进行中。整个范围经确认完整且零记录时视为无待办，达成并计满分。已有记录必要字段为空或格式错误、来源不可用或覆盖不完整仍为未确定，并保留具体诊断。

Inspection Status remains nullable open text. Preserve source text; only the exact normalized value `已完成` means completed. Other non-empty values are not completed under the existing rule; missing status or incomplete source coverage does not prove completion. A malformed non-string status is `SOURCE_INVALID`; it does not introduce a new completed-status mapping.

---

## 3.5 Events / ASTM Incident

### Purpose

Determine whether any ASTM Incident occurred within the selected scope.

### ASTM Source Field

`ASTMInjuryIllness`

### Rule

At least one Event has:

`ASTMInjuryIllness = "Yes"`

→ `OCCURRED`

No Event has:

`ASTMInjuryIllness = "Yes"`

→ `NOT_OCCURRED`

The source enum is `Yes` / `No`. An unknown enum value makes scoped Event coverage `INCOMPLETE`; it must not be treated as `No` or yield `NOT_OCCURRED`.

### Important Constraints

- Do not maintain a separate ASTM Incident dataset.
- Do not count ASTM incidents for KPI presentation.
- KPI represents whether ASTM occurred, not how many occurred.

### Result Type

`OccurrenceResult`

---

# 4. Performance → Goals

## 4.1 Take Charge Submission Total

### Input

All Take Charge records whose `Submitted At` is within the selected Period.

### Rule

Return the record count. Complete coverage with no records returns `0`.

Submission totals, close rates and record lists use all received records whose submission time falls inside the full selected period. Do not judge completeness by the year/month range generated by Mock, and do not truncate historical or future queries. With no matching records, return total `0` and close rate `null` (display “-”). Only actual record defects (invalid/missing necessary fields, invalid dates or unresolved source identities) make the period result incomplete. Server-side authorization, period validation and annual metric rules remain unchanged.

---

## 4.2 Take Charge Close Rate

### Input

Monthly `totalCount` and `closedCount`, built from normalized Take Charge records.

### Rule

`closedCount / totalCount * 100`.

Only `ClosedWithAction`, `ClosedWithoutAction`, and `Declined` contribute to `closedCount`. For multiple months, sum all numerators and denominators before division. Do not average monthly percentages.

Value >= 90
→ `ACHIEVED`

Value < 90
→ `NOT_ACHIEVED`

Actual record defects preventing a reliable count or status interpretation
→ `UNDETERMINED`

Zero matching records without actual data defects returns `null` and displays “-”; it must not become `0%` or `100%`.

### Result Type

`PerformanceResult`

---

## 4.3 Current-year Submissions per Capita

The source provides the aggregate for the selected Region / Area / Store scope from January through the Dashboard reference month. It ignores Global Period. For multi-store scopes, do not average store-level final values.

Target: `>= 4`. Missing or invalid aggregate → `UNDETERMINED`.

---

## 4.4 Current-year Participation Rate

### Input

Percentage value using internal `0–100` representation.

The source provides the aggregate for the selected Region / Area / Store scope from January through the Dashboard reference month. It ignores Global Period. For multi-store scopes, do not average store-level final percentages.

### Target

`>= 50`

### Rule

Value >= 50
→ `ACHIEVED`

Value < 50
→ `NOT_ACHIEVED`

Value missing / invalid
→ `UNDETERMINED`

### Result Type

`PerformanceResult`

---

# 5. Risk & Compliance → Events

Event open/closed classification is defined in:

`status-dictionary.md`

The Metric Rule layer does not maintain a second Event Status mapping.

Confirmed mapping:

- `Open` → `OPEN`
- `Closed` → `CLOSED`
- any unsupported value → `UNKNOWN`; it must not enter `OPEN_ONLY`

Events detail queries apply Global Region / Area / Store and the Global Period
to source `Event Date` using `[startInclusive, endExclusive)`. `OPEN_ONLY`
adds `RecordState = OPEN`; `ALL` retains all normalized records in the same
scope, including `UNKNOWN`. Event Type filtering uses the normalized source
value and does not change business status.

`Event Date` is the stable source / contract field name. User-facing terminology is `Event Time` / “事件时间”.

Events Analytics closure rate is `CLOSED / (CLOSED + OPEN) * 100`. `UNKNOWN`
records remain included in the ALL-scope total and event type distribution, but
are excluded from the closure-rate denominator. If a scope or month contains no
OPEN or CLOSED records, its closure rate is null rather than zero. Monthly rates
use records whose Event Date falls within that Asia/Shanghai calendar month.

ASTM evaluation follows section `3.5`.

---

# 6. Risk & Compliance → Actions

Action lifecycle classification is defined in:

`status-dictionary.md`

Action detail records do NOT determine the Performance → KPI → Action Closure Rate.

Action Closure Rate remains a source-provided aggregate value.

Action `RecordState` is used only for Action detail lifecycle and filtering.
The centralized mapping is:

- `Assigned`, `In Progress`, `In Review`, `Sign Off` → `OPEN`
- `Closed` → `CLOSED`
- `Cancelled` → `EXCLUDED`
- any unmapped future status → `UNKNOWN`

The raw source Status is preserved. UI components must not reclassify it.
`Cancelled → EXCLUDED` means the record is omitted from `OPEN_ONLY` Action
details. It must not be interpreted as a rule for the Action Closure Rate
numerator or denominator.

All Action detail views apply the shared Global Period to source / contract
`Submitted Date` (`submittedDate`; user-facing “Submitted Time” / “提交时间”)
using Asia/Shanghai `[startInclusive, endExclusive)`. The default `OPEN_ONLY`
filter additionally requires centralized `RecordState = OPEN`; the Actions UI
initially selects `ALL`, which keeps OPEN, CLOSED, EXCLUDED and UNKNOWN records.
Performance → KPI Action drill-down and
Risk & Compliance → Actions `OPEN_ONLY` reuse this normalized query and return
the same OPEN Action IDs for the same Store scope and Period. Detail records
never determine or reconcile the source-provided Action Closure Rate aggregate.

Due Date must not be used to automatically derive an `Overdue` status unless a future business rule explicitly defines that behavior.

### Actions Analytics V1

The Actions page Analytics closure rate is a separate detail-derived metric; it
does not replace or reconcile the Performance → KPI source-provided Action
Closure Rate. Within the current Global Filter scope, all Actions are the
denominator. Only known `Closed` and `Cancelled` source statuses are the
numerator; OPEN and UNKNOWN records remain in the denominator but not the
numerator. Thus `Cancelled` remains `EXCLUDED` for lifecycle filtering while
counting in this Analytics numerator by explicit page metric definition. With
no scoped records, the rate is null.

The Actions monthly count trend uses the normalized `Submitted Date` and the
current Global Period's complete included-month sequence. The Repository / Rule
returns zero-filled months in ascending order. Table view mode, sorting and
pagination do not affect either Analytics result.

---

# 7. Risk & Compliance → Certificates

## 7.1 Certificate Type → Category

仅允许以下 exact match；不 trim、猜别名、模糊匹配或使用 Person / Business Title：

| Category | Certificate Type（exact match） |
|---|---|
| 安全健康 | `主要负责人安全生产培训合格证书-S` |
| 安全健康 | `安全生产管理人员安全生产培训合格证书-M` |
| 安全健康 | `主要负责人职业卫生培训合格证书-H1` |
| 安全健康 | `职业卫生管理人员职业卫生培训合格证书-H2` |
| 急救员 | `急救员证` |
| 特种作业 | `熔化焊接与热切割作业` |
| 安全驾驶 | `安全驾驶内训师` |
| 安全驾驶 | `安全驾驶内驾证` |

未知 Type 保留原始值与 null Category，不参与四个已知类别汇总。

## 7.2 单证规则

输入为 date-only Expiry Date 与注入的 Dashboard referenceDate（Asia/Shanghai 业务日期），不得读取当前系统或浏览器时间。

- 有效日期 >= referenceDate → NORMAL / NORMAL。
- 有效日期 < referenceDate → ABNORMAL / EXPIRED。
- 日期 null 或空值 → ABNORMAL / MISSING_EXPIRY_DATE。
- 无法解析为合法 YYYY-MM-DD → ABNORMAL / INVALID_EXPIRY_DATE。

daysUntilExpiry 为两个业务日期的自然日差；到期当天为 0 且有效，过去日期保留负值。缺失或无效日期为 null。不得产生时区 ±1 天偏差。

## 7.3 Store × Category

- 零记录 → ABNORMAL。
- 任一单证 ABNORMAL → ABNORMAL。
- 至少一张且全部 NORMAL → NORMAL。

仅评价已上传记录，不检查 S / M / H1 / H2 或安全驾驶两种 Type 是否齐全。类别状态不执行 Required Slot 完整性判断，不产生人数要求结论、UNDETERMINED、即将到期或提醒规则。Overview 的四个证件 scoring metrics 分别映射四类该 Domain Result，仍各占 1/1；缺记录或任一异常记录均为 0/1。Certificate Overview 的类型数量要求不参与该类别评分。输出仅业务语义，不返回 UI 样式。

Standard 与 Performance Mock 共用 `createMockCertificateRecords`。生成器需覆盖整个 Store 集合，并稳定包含有效（含到期日当天）、过期、缺少日期、非法日期、类别缺失及少量空门店样本。只有前 11 家有记录会使其余 Store 的四类指标全部依据正式零记录规则得 0/1；这不是评分实现缺陷。

## 7.4 Certificate Overview counts

Certificate Overview 独立于 Store × Category 状态规则，展示所有正式 Certificate Type。分类与类型顺序取自 `src/lib/rules/certificate-types.ts` 的集中分类与 Type 映射；每个分类内保持该映射的登记顺序。概览直接显示 Type 全名，新增小类只需登记集中 Type → Category 映射；短标签不再是概览显示的前提。要求配置集中于 `src/lib/rules/certificate-requirements.ts`：`主要负责人安全生产培训合格证书-S`、`安全生产管理人员安全生产培训合格证书-M`、`主要负责人职业卫生培训合格证书-H1`、`职业卫生管理人员职业卫生培训合格证书-H2` 各 1 / scoped store；`急救员证` 为 2 / scoped store；`安全驾驶内训师` 为 1 / scoped store。`安全驾驶内驾证` 与 `熔化焊接与热切割作业` 未设置 Requirement。

`requiredCount = scopedStoreCount × requiredPerStore`；没有配置时 `requiredCount = null`，表示未设置，不表示 0。`actualCount` 和本轮已实现口径保持不变。Region / Area / Store 影响门店数和实际记录范围；Period 忽略。图表不推导合规状态，也不改变 Store × Category 结果。 服务端另准备 `progressValue`：应持有数量大于 0 时为 `actualCount / requiredCount × 100` 并将图形限制在 0–100；应持有未设置或为 0 时为 null，仅保留空底条，不填充比例进度；未设置时显示“实际数量 / 未设置”。超过目标时仍完整显示实际数量。UI 只消费已准备的值。

## 7.5 Filters

Region / Area / canonical Store 生效。Period ignored；referenceDate 仅用于有效期和天数评价，与 Global Period 独立。

本次正式 V1 覆盖旧 Certificates 完整性与别名规则。

# 8. Risk & Compliance → Environment

## 8.0 Current-state Environment V1 boundary

当前 detail V1 仅展示环境影响评价、排污许可、排水许可、环境预案、监测与废弃物合同 source data，不产生合规 Business Result。“无”不能推导异常、健康度或评分。Region / Area / Store 生效，Period ignored。

以下 8.1–8.8 是历史环境合规需求，**不属于 Environment 当前状态 V1，也不是 Overview 可直接消费的当前合规结果**。后续适用关系与真实输入需另行确认；不得将这些规则应用到六个当前源值。

## 8.1 Result Type

Compliance rules return:

`ComplianceResult`

unless otherwise stated.

---

## 8.2 Hazardous Waste Contract

### Rule

No Hazardous Waste Contract exists
→ `ABNORMAL`

Any Hazardous Waste Contract is expired
→ `ABNORMAL`

At least one contract exists and all Hazardous Waste Contracts are valid
→ `NORMAL`

Missing required Expiry Date with no earlier abnormal result
→ `UNDETERMINED`

---

## 8.3 General Solid Waste Contract

### Rule

No General Solid Waste Contract exists
→ `ABNORMAL`

Any General Solid Waste Contract is expired
→ `ABNORMAL`

At least one contract exists and all General Solid Waste Contracts are valid
→ `NORMAL`

Missing required Expiry Date with no earlier abnormal result
→ `UNDETERMINED`

---

## 8.4 Combined Waste Contract Compliance

Both contract categories are mandatory.

Combined result:

Hazardous Waste Contract = NORMAL
AND
General Solid Waste Contract = NORMAL
→ `NORMAL`

Either category = ABNORMAL
→ `ABNORMAL`

If neither category is ABNORMAL but at least one category = UNDETERMINED
→ `UNDETERMINED`

This combined result ensures the confirmed requirement:

- both contract categories must exist;
- expiration of any relevant contract causes non-compliance.

Individual category results remain available for detailed display.

---

## 8.5 Car Wash / Drainage Permit

### Rule

`Has Car Wash = No`
→ `NORMAL`

`Has Car Wash = Yes`
AND
`Has Drainage Permit = No`
→ `ABNORMAL`

`Has Car Wash = Yes`
AND
`Has Drainage Permit = Yes`
AND
permit expired
→ `ABNORMAL`

`Has Car Wash = Yes`
AND
`Has Drainage Permit = Yes`
AND
permit valid
→ `NORMAL`

Required boolean or expiry information missing such that the rule cannot be evaluated
→ `UNDETERMINED`

---

## 8.6 EIA

EIA has no expiry-date rule.

### Rule

`EIA Required = No`
→ `NORMAL`

`EIA Required = Yes`
AND
no EIA Information exists
→ `ABNORMAL`

`EIA Required = Yes`
AND
EIA Information exists
→ `NORMAL`

`EIA Required` missing / unknown
→ `UNDETERMINED`

The minimum source-data structure constituting valid `EIA Information` is defined in `data-contract.md`.

---

## 8.7 Discharge Permit

### Rule

`Discharge Permit Required = No`
→ `NORMAL`

`Discharge Permit Required = Yes`
AND
no Permit Information exists
→ `ABNORMAL`

`Discharge Permit Required = Yes`
AND
Permit exists but is expired
→ `ABNORMAL`

`Discharge Permit Required = Yes`
AND
Permit exists and is valid
→ `NORMAL`

Required information missing such that the rule cannot be evaluated
→ `UNDETERMINED`

---

## 8.8 Environmental Monitoring

Environmental Monitoring does not currently produce a compliance result.

It only produces record availability:

No monitoring records in the selected scope
→ `NONE`

One or more monitoring records exist
→ `AVAILABLE`

Result Type:

`AvailabilityState`

The following are NOT currently defined:

- monitoring compliance;
- pass/fail result;
- required monitoring frequency;
- required monitoring periods;
- whether missing monitoring records constitute non-compliance.

The rule layer must not infer these conditions.

---

## 8.9 Environment Analytics V1

- 查询不接收 Global Period；到期合同数量使用 Dashboard `referenceDate` 所在自然月，持有率继续按该 referenceDate 判断有效性。
- 危险废物合同持有率 = 当前 Global Filters 范围内至少有一条在 Dashboard `referenceDate` 当天有效的危险废物合同的门店数 ÷ 当前范围内全部门店数；一般工业固体废物合同持有率按对应合同类型使用同一口径。有效定义为 `validTo` 是合法 date-only 值且 `validTo >= referenceDate`；截止日期缺失、无效或早于 referenceDate 均不计为有效合同。每店每类只计一次，多份合同中任一条有效即计入。Environment 数据不完整或范围内没有门店时，比例为 null。
- 到期合同数量仅统计危险废物与一般工业固体废物合同记录。`validTo` 为合法 date-only 值，且其自然月等于 Dashboard `referenceDate` 所在自然月时计 1 条。缺失或无效日期不计入，并保留排除记录数。scoped Environment 数据为 `INCOMPLETE` / `UNAVAILABLE` 时，总数为 null，不能显示部分计数为完整结论。
- 持有率和到期合同数量只响应 Region / Area / Store 与 referenceDate；到期数的当月范围由 referenceDate 导出，不响应 Global Period。所有筛选和聚合均由 Environment Repository 与本规则层完成；React 不过滤合同、不计数、不比较日期。

# 9. Rule Output Contract

Business rule functions should return explicit semantic results rather than UI colors or labels.

Examples:

Training
→ `PerformanceResult`

Certificate
→ V1 `NORMAL / ABNORMAL + reason + daysUntilExpiry`

ASTM
→ `OccurrenceResult`

Environmental Monitoring
→ historical compliance scope `AvailabilityState`; current-state Environment V1 remains a neutral source value

Record lifecycle status such as Event / Action / Take Charge Open/Closed is defined by `status-dictionary.md`.

No Rule Engine function should return:

- Tailwind classes;
- color names;
- Badge variants;
- icons;
- localized UI text.

# 10. Overview V1 scoring rules

Overview consumes domain results and records a per-Store, per-metric, per-month contribution. It does not interpret raw source records or recalculate domain results.

## 10.1 Fixed V1 points and score rate

Each of the 12 catalog entries applies to every Store and contributes exactly `availablePoints = 1` per month. V1 has no per-Store N/A denominator exclusion. An existing domain `ACHIEVED` result contributes `outcome = ACHIEVED`, `earnedPoints = 1`; `NOT_ACHIEVED`, `UNDETERMINED`, or any other result that cannot prove achievement contributes `outcome = NOT_ACHIEVED`, `earnedPoints = 0`. The reason preserves whether this was a valid rule failure, missing source, invalid source, incomplete coverage, explicit N/A, or missing scoring configuration. None removes the metric from the denominator. V1 therefore has `12` total available points per Store × Month, the same for every Store, and does not calculate Overview completeness.

`scoreRate = sum(earnedPoints) / sum(availablePoints)`. Store, Area, and Region all use pooled points. Area / Region first sum all descendant contributions and then calculate the rate; never average descendant score rates. All Stores participate in ranking. Ranking uses formal `scoreRate`, with a deterministic tie-break. Overview 始终取 reference month 的 scoreRate，并与上一个自然月比较。Change is `currentScoreRate - previousScoreRate`; UI 显示 `%` 但数值是得分率差值，不是相对增长率；no completeness gate is applied.

Data-quality cause remains attached to each contribution and does not alter its points. The diagnostic reason values are `ACHIEVED`, `RULE_NOT_MET`, `SOURCE_MISSING`, `SOURCE_INVALID`, `SOURCE_INCOMPLETE`, `NOT_APPLICABLE`, and `RULE_CONFIGURATION_MISSING`. `NOT_APPLICABLE` records an explicit domain applicability result but still contributes 0/1 in V1. `RULE_CONFIGURATION_MISSING` distinguishes an absent required-set/configuration from a missing source record. Domain preparation classifies the cause; contribution production preserves it and Overview UI does not derive it. Concrete source defects take precedence over generic coverage/threshold failures: SOURCE_INVALID > SOURCE_MISSING > SOURCE_INCOMPLETE > RULE_CONFIGURATION_MISSING > RULE_NOT_MET. Received-record evaluation checks all supplied records before selecting a reason, so input order or an earlier below-target record cannot hide a later invalid record.

## 10.2 V1 scoring metric catalog

Each row below has one available point per Store × Month. Existing domain rules remain authoritative; this section defines only how their results enter Overview scoring.

| Metric | Dimension | Domain result used by scoring | V1 contribution |
|---|---|---|---|
| Training | Performance | Section 3.1; all supplied records have completionRate = 100; confirmed empty is achieved | ACHIEVED 1/1 (including confirmed empty); otherwise 0/1 with diagnostic reason |
| Drill | Performance | Section 3.2 monthly result | ACHIEVED 1/1; otherwise 0/1 with diagnostic reason |
| Action Closure Rate KPI | Performance | Section 3.3 source aggregate and >= 90% target | ACHIEVED 1/1; otherwise 0/1 with diagnostic reason; do not derive from Action details |
| Inspection | Performance | Section 3.4; all supplied records completed; confirmed empty is achieved | ACHIEVED 1/1 (including confirmed empty); otherwise 0/1 with diagnostic reason |
| ASTM Incident | Performance | Section 3.5 `OccurrenceResult` | `NOT_OCCURRED` → ACHIEVED 1/1; `OCCURRED` → NOT_ACHIEVED 0/1; missing / invalid / incomplete → 0/1 with the corresponding diagnostic reason |
| Take Charge Close Rate | Take Charge | Section 4.2 Goal result | ACHIEVED 1/1; otherwise 0/1 with diagnostic reason |
| Submissions per Capita YTD | Take Charge | Section 4.3 source aggregate and >= 4 target | ACHIEVED 1/1; otherwise 0/1 with diagnostic reason |
| Participation Rate YTD | Take Charge | Section 4.4 source aggregate and >= 50% target | ACHIEVED 1/1; otherwise 0/1 with diagnostic reason |
| Safety & Health Certificates | Certificates | Section 7 Store × Category result | NORMAL 1/1; ABNORMAL 0/1 |
| First Aid Certificates | Certificates | Section 7 Store × Category result | NORMAL 1/1; ABNORMAL 0/1 |
| Special Work Certificates | Certificates | Section 7 Store × Category result | NORMAL 1/1; ABNORMAL 0/1 |
| Safe Driving Certificates | Certificates | Section 7 Store × Category result | NORMAL 1/1; ABNORMAL 0/1 |

Environment is not in the V1 catalog. Current Environment V1 has no compliance or score result. A future Environment metric must first have a confirmed domain result and then emit the same contribution contract; the Overview aggregation formula does not change.

KPI Training / Inspection evaluate all supplied records in the selected period. Monthly Overview uses the same evaluator for that month; a covered empty month contributes 1/1. No task provider or monthly presence check is required. Mock catalogs supply example names only. Legacy required-set import contracts are not scoring prerequisites.

## 10.3 History contribution invariant

For every Store × V1 Metric × Month, the calculation must produce one contribution, including unavailable source data: `earnedPoints = 0`, `availablePoints = 1`, `reason = SOURCE_MISSING`. Confirmed complete but empty Training / Inspection is distinct: it contributes 1/1 with `ACHIEVED`. Absence of a contribution must not mean missing source. Source-invalid and source-incomplete cases likewise keep the 0/1 denominator and their distinct reasons.

Use domain historical records evaluated with the relevant month-end reference date when that reliably reconstructs the domain result. Use a production snapshot later when historical records cannot reliably reconstruct it. No snapshot mechanism is defined or implemented by this Phase 1 contract.
