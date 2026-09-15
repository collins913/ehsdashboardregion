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

Except for Store Master Data and current-state Environment / Certificates V1 (which ignore Period), business results are evaluated within the current Global Filters scope:

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

How production determines `referenceDate` is an application-level policy and remains:

`TBD`

This does not prevent deterministic testing because tests can inject a reference date.

---

# 3. Performance → KPI

## 3.1 Training

### Purpose

Determine whether all required Training records that exist within the selected Period have been fully completed by the Store.

### Input

- required Training records that exist within the selected Period;
- whether each required Training achieved full-person completion;
- Training source coverage for the requested Store × Period.

### Rule

All existing required Training records are fully completed
→ `ACHIEVED`

Any existing required Training record is not fully completed
→ `NOT_ACHIEVED`

Complete source coverage with no Training records
→ `ACHIEVED`

Incomplete or unavailable source coverage
→ `UNDETERMINED`

### Result Type

`PerformanceResult`

### Explicit TBD

- how the required Training set is identified;
- source-system mapping to “fully completed”.

These Period/source mappings must be resolved outside the UI.

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

### Explicit TBD

- partial-month inclusion follows the Period policy;
- mapping of source Drill Status to “completed”.

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

### Purpose

Determine whether all required Inspections within the selected Period were completed.

### Rule

For every included month:

At least one required Inspection exists and all required Inspections are completed
→ month passes

No required Inspection exists, or any required Inspection is incomplete
→ month fails

All included months pass
→ `ACHIEVED`

Any included month fails
→ `NOT_ACHIEVED`

Incomplete or unavailable Inspection source coverage
→ `UNDETERMINED`

### Result Type

`PerformanceResult`

### Explicit TBD

- mapping of source Inspection Status to “completed”;
- source of the required Inspection set.

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

Incomplete source coverage
→ `UNDETERMINED`

Complete coverage with zero records returns `null` and displays “无”; it must not become `0%` or `100%`.

### Result Type

`PerformanceResult`

---

## 4.3 Current-year Average Submissions

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
adds `RecordState = OPEN`; `ALL` retains the supported lifecycle states in the
same scope. Event Type filtering uses the normalized source value and does not
change business status.

`Event Date` is the stable source / contract field name. User-facing terminology is `Event Time` / “事件时间”.

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
view additionally requires centralized `RecordState = OPEN`; `ALL` keeps OPEN,
CLOSED, EXCLUDED and UNKNOWN records. Performance → KPI Action drill-down and
Risk & Compliance → Actions `OPEN_ONLY` reuse this normalized query and return
the same OPEN Action IDs for the same Store scope and Period. Detail records
never determine or reconcile the source-provided Action Closure Rate aggregate.

Due Date must not be used to automatically derive an `Overdue` status unless a future business rule explicitly defines that behavior.

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

仅评价已上传记录，不检查 S / M / H1 / H2 或安全驾驶两种 Type 是否齐全。无 Required Slot、人数要求、UNDETERMINED、即将到期或提醒规则。输出仅业务语义，不返回 UI 样式。

## 7.4 Filters

Region / Area / canonical Store 生效。Period ignored；referenceDate 仅用于有效期和天数评价，与 Global Period 独立。

本次正式 V1 覆盖旧 Certificates 完整性与别名规则。

# 8. Risk & Compliance → Environment

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

# 9. Rule Output Contract

Business rule functions should return explicit semantic results rather than UI colors or labels.

Examples:

Training
→ `PerformanceResult`

Certificate
→ `ComplianceResult + reason`

ASTM
→ `OccurrenceResult`

Environmental Monitoring
→ `AvailabilityState`

Record lifecycle status such as Event / Action / Take Charge Open/Closed is defined by `status-dictionary.md`.

No Rule Engine function should return:

- Tailwind classes;
- color names;
- Badge variants;
- icons;
- localized UI text.
