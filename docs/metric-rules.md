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

Except for Store Master Data, business results are evaluated within the current Global Filters scope:

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

- Do not use `Severity` to determine ASTM status.
- Severity is descriptive only.
- Do not maintain a separate ASTM Incident dataset.
- Do not count ASTM incidents for KPI presentation.
- KPI represents whether ASTM occurred, not how many occurred.

### Result Type

`OccurrenceResult`

---

# 4. Performance → Goals

All Goal values are provided directly by the source data.

Dashboard does not recalculate these values from detail records.

---

## 4.1 Take Charge Submissions per Capita

### Input

Numeric value.

### Target

`>= 4`

### Rule

Value >= 4
→ `ACHIEVED`

Value < 4
→ `NOT_ACHIEVED`

Value missing / invalid
→ `UNDETERMINED`

### Result Type

`PerformanceResult`

---

## 4.2 Take Charge Close Rate

### Input

Percentage value using internal `0–100` representation.

### Target

`>= 90`

### Rule

Value >= 90
→ `ACHIEVED`

Value < 90
→ `NOT_ACHIEVED`

Value missing / invalid
→ `UNDETERMINED`

### Important Constraint

Take Charge Close Rate is supplied directly by the source data.

Do not calculate it from Take Charge records.

### Result Type

`PerformanceResult`

---

## 4.3 Take Charge Participate Rate

### Input

Percentage value using internal `0–100` representation.

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

Risk & Compliance → Actions applies the shared Global Period to source
`Submitted Date` using `[startInclusive, endExclusive)`. Its default
`OPEN_ONLY` view additionally requires centralized `RecordState = OPEN`; the
`ALL` view keeps OPEN, CLOSED, EXCLUDED and UNKNOWN records in the same Period.

Performance → KPI Action drill-down follows the current Region / Area / Store
scope but does not apply Global Period to exclude older unresolved Actions. It
shows all current `RecordState = OPEN` records. Action detail availability is
determined by detail-source and store-sync coverage, independently of the
Closure Rate aggregate period.

Due Date must not be used to automatically derive an `Overdue` status unless a future business rule explicitly defines that behavior.

---

# 7. Risk & Compliance → Certificates

## 7.1 Purpose

Evaluate each:

`Store × Certificate Category`

for certificate completeness and validity.

---

## 7.2 Result Type

`ComplianceResult`

Possible rule results:

- `NORMAL`
- `ABNORMAL`
- `UNDETERMINED`

Display reasons are defined separately in:

`status-dictionary.md`

---

## 7.3 Required Slot Definitions

Certificate Type matching is exact against the explicitly accepted values below.

No additional alias, fuzzy matching, Person, Role, or Title matching is permitted.

| Certificate Category | Required Slot | Accepted Certificate Type |
|---|---|---|
| 安全证书 | S | `主要负责人安全生产培训合格证书-S` |
| 安全证书 | S | `店长安全证` |
| 安全证书 | M | `安全生产管理人员安全生产培训合格证书-M` |
| 安全证书 | M | `EHS RN安全证` |
| 职业卫生证书 | H1 | `主要负责人职业卫生培训合格证书-H1` |
| 职业卫生证书 | H1 | `职业健康证` |
| 职业卫生证书 | H2 | `职业卫生管理人员职业卫生培训合格证书-H2` |
| 职业卫生证书 | H2 | `职业健康证` |
| 急救员 | First Aid | `急救员证` |
| 急救员 | First Aid | `红十字急救员` |
| 焊工证 | Welding | `熔化焊接与热切割作业` |
| 焊工证 | Welding | `焊工证` |
| 内驾证 | Trainer | `内训师` |
| 内驾证 | Internal Driving | `内驾证` |

---

## 7.4 Slot Matching Rules

1. Retrieve all Certificate records belonging to the Store and Certificate Category.
2. Match Required Slots using exact Certificate Type values listed in section 7.3.
3. One Certificate record may satisfy only one Required Slot.
4. A Certificate record already assigned to one Slot cannot be reused.
5. Person, Role and Title do not participate in Slot matching.
6. Explicit accepted values in section 7.3 are the complete matching dictionary.
7. No additional aliases or fuzzy text matching may be introduced.
8. Certificate records not used by a Required Slot remain additional Certificate records for that category.

Special case:

Both H1 and H2 accept:

`职业健康证`

Therefore:

- one `职业健康证` record can satisfy only H1 or H2;
- two separate `职业健康证` records may satisfy both H1 and H2.

---

## 7.5 Certificate Category Evaluation

Evaluation order:

### Step 1 — No Records

No Certificate records exist for the category
→ `ABNORMAL`

Reason:
`NO_RECORD`

### Step 2 — Required Slot Completeness

One or more Required Slots cannot be matched
→ `ABNORMAL`

Reason:
`MISSING_REQUIRED_SLOT`

### Step 3 — Expiry Validation

Evaluate ALL Certificate records in the category, including:

- records used for Required Slots;
- additional/unmatched records.

Any Certificate is expired
→ `ABNORMAL`

Reason:
`EXPIRED_CERTIFICATE`

Therefore, an expired additional Certificate also makes the entire category abnormal.

### Step 4 — Missing Expiry Date

If an expiry date required for evaluation is missing and no earlier rule has already produced `ABNORMAL`
→ `UNDETERMINED`

Reason:
`MISSING_EXPIRY_DATE`

### Step 5 — Normal

All Required Slots are matched AND all Certificate records are valid
→ `NORMAL`

Reason:
`NORMAL`

---

## 7.6 Certificate Exclusions

The system does NOT implement:

- expiring-soon status;
- expiry reminders;
- role-based Slot matching;
- fuzzy matching;
- automatic alias discovery.

---

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
