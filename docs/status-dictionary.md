# EHS Dashboard — Status Dictionary

- Version: V1.0
- Date: 2026-09-10
- Status: Confirmed status semantics and source-status mappings

---

## 1. Document Responsibility

This document is the single source of truth for:

- normalized business statuses;
- raw Status → normalized status mappings;
- status terminology;
- status display meaning;
- status-to-UI semantic intent.

This document does NOT define:

- KPI formulas;
- thresholds;
- Certificate Slot calculations;
- environmental compliance formulas;
- page layout;
- database fields;
- literal colors.

Calculation rules are defined in:

`metric-rules.md`

---

# 2. Status Architecture

Statuses are divided into separate layers:

Raw Status
→ Normalized Status
→ Business Evaluation
→ UI Semantic Intent

These layers must not be mixed.

Example:

Source:
`ClosedWithAction`

Normalized lifecycle:
`CLOSED`

Goal metric:
`92`

Business evaluation:
`ACHIEVED`

UI semantic intent:
`POSITIVE`

---

# 3. PerformanceResult

Used for KPI and Goal achievement.

Allowed values:

## ACHIEVED

Meaning:

The confirmed KPI / Goal requirement is satisfied.

Default display label:

`达成`

UI semantic intent:

`POSITIVE`

---

## NOT_ACHIEVED

Meaning:

The confirmed KPI / Goal requirement is not satisfied.

Default display label:

`未达成`

UI semantic intent:

`NEGATIVE`

---

## UNDETERMINED

Meaning:

Available data or rules are insufficient to produce a reliable business conclusion.

It must not be interpreted as:

- Achieved
- Not Achieved
- Zero
- No
- Missing record
- Normal

Default display label:

`—`

UI semantic intent:

`NEUTRAL`

---

# 4. ComplianceResult

Used for compliance-oriented modules such as:

- Certificates
- Environment

Allowed values:

## NORMAL

Meaning:

Confirmed compliance requirements are satisfied.

Default display label:

`正常`

UI semantic intent:

`POSITIVE`

---

## ABNORMAL

Meaning:

One or more confirmed compliance requirements are not satisfied.

Default display label:

`异常`

UI semantic intent:

`NEGATIVE`

---

## UNDETERMINED

Meaning:

The rule cannot safely determine Normal or Abnormal.

Default display label:

`—`

UI semantic intent:

`NEUTRAL`

---

# 5. OccurrenceResult

Used for occurrence-based KPI such as ASTM Incident.

Allowed values:

## NOT_OCCURRED

Meaning:

No ASTM Event exists in the selected scope according to the confirmed ASTM rule.

Default display label:

`未发生`

UI semantic intent:

`POSITIVE`

---

## OCCURRED

Meaning:

At least one ASTM Event exists in the selected scope.

Default display label:

`发生`

UI semantic intent:

`NEGATIVE`

---

# 6. RecordState

Used to normalize record lifecycle for:

- Events
- Actions
- Take Charge

Allowed values:

- `OPEN`
- `CLOSED`
- `EXCLUDED`
- `UNKNOWN`

RecordState is used to normalize record lifecycle and filter record details.

It must not be used to calculate KPI aggregate values, numerators, or denominators.

It does not overwrite the original source `Status`.

The UI may continue displaying the original source Status in record details.

---

## OPEN

Meaning:

The record is currently considered not closed.

---

## CLOSED

Meaning:

The record has reached a confirmed closed state.

---

## EXCLUDED

Meaning:

The record is not Open but should not be semantically represented as Closed.

Current example:

`Action Status = Cancelled`

---

## UNKNOWN

Meaning:

The source Status does not have a confirmed mapping.

The frontend must not guess how to classify it.

---

# 7. Event Status Mapping

Source field:

`Status`

Confirmed mapping:

| Raw Event Status | RecordState |
|---|---|
| `Closed` | `CLOSED` |
| Any other value | `OPEN` |

Important:

For Events only, the confirmed business rule explicitly treats every non-`Closed` source Status as Open.

Do not maintain an independent list of Event Open statuses.

Do not infer Event lifecycle from:

- Severity
- ASTMInjuryIllness
- Event Date Time
- other fields.

---

# 8. Take Charge Status Mapping

Source field:

`Status`

Confirmed Closed statuses:

| Raw Take Charge Status | RecordState |
|---|---|
| `ClosedWithAction` | `CLOSED` |
| `ClosedWithoutAction` | `CLOSED` |
| `Declined` | `CLOSED` |
| Any other value | `OPEN` |

Important:

Any source Status not equal to the three confirmed Closed values is considered Open.

This mapping is used only for Take Charge record lifecycle and drill-down filtering.

Take Charge Close Rate remains a source-provided aggregate metric and is NOT recalculated from these records.

---

# 9. Action Status Mapping

Source field:

`Status`

Current confirmed mapping:

| Raw Action Status | RecordState |
|---|---|
| `Assigned` | `OPEN` |
| `InProgress` | `OPEN` |
| `Closed` | `CLOSED` |
| `Cancelled` | `EXCLUDED` |
| Any other value | `UNKNOWN` |

`EXCLUDED` applies only to Action record lifecycle and the `OPEN_ONLY` detail
filter. It means a cancelled Action is omitted from open Action details. It does
not define whether that Action participates in Action Closure Rate because that
KPI is supplied directly by the source data.

Important:

Unlike Events and Take Charge, unknown Action statuses must NOT automatically be classified as Open.

Future Action status values require an explicit mapping update.

Do not infer Action lifecycle from:

- Due Date
- Closed Date
- Created Date
- Owner.

---

# 10. Open / All Filter

`Open / All` is a view filter, not a business status.

Normalized filter values:

## OPEN_ONLY

Include only records where:

`RecordState = OPEN`

---

## ALL

Include all source records within the current Global Filter scope, including:

- OPEN
- CLOSED
- EXCLUDED
- UNKNOWN

The original Status value remains available for display.

---

# 11. Certificate Status Semantics

Certificate rule calculation is defined in:

`metric-rules.md`

Certificate business result uses:

`ComplianceResult`

Additional reason codes are used to explain why a category received its result.

Allowed reason codes:

| Reason Code | Meaning | Business Result |
|---|---|---|
| `NO_RECORD` | 该类别完全没有证件记录 | `ABNORMAL` |
| `MISSING_REQUIRED_SLOT` | 至少一个 Required Slot 未满足 | `ABNORMAL` |
| `EXPIRED_CERTIFICATE` | 该类别存在至少一张过期证件 | `ABNORMAL` |
| `MISSING_EXPIRY_DATE` | 缺少必要有效期信息，无法可靠判定 | `UNDETERMINED` |
| `NORMAL` | Slot 完整且全部证件有效 | `NORMAL` |

Important distinction:

`NO_RECORD`

is an abnormal business result, but its UI may display a more specific reason such as:

`无`

rather than displaying only:

`异常`

Therefore:

Business Result
= `ABNORMAL`

Reason
= `NO_RECORD`

Display
= `无`

This preserves both:

- management conclusion;
- reason clarity.

---

# 12. Environmental Monitoring Availability

Environmental Monitoring currently does NOT use `ComplianceResult`.

It uses:

`AvailabilityState`

Allowed values:

## NONE

Meaning:

No Environmental Monitoring records exist in the current selected scope.

Default display label:

`无`

This does NOT currently imply:

- Normal
- Abnormal
- Passed
- Failed

UI semantic intent:

`NEUTRAL`

---

## AVAILABLE

Meaning:

At least one Environmental Monitoring record exists.

Default UI action:

`查看`

`查看` is an interaction label, not a compliance status.

The UI should normally render it as an interactive control/link rather than a status Badge.

UI semantic intent:

`INFORMATIONAL`

---

# 13. Raw Status Preservation

When a source record contains a Status value:

- preserve the source value;
- do not overwrite it with normalized RecordState;
- use normalized RecordState only where business filtering or aggregation requires it.

Example:

Raw Status:
`InProgress`

Normalized RecordState:
`OPEN`

Detail view may display:
`InProgress`

Open filter uses:
`OPEN`

---

# 14. UI Semantic Intent

Status Dictionary defines semantic intent but does not define literal colors.

Allowed intents:

## POSITIVE

Used for:

- ACHIEVED
- NORMAL
- NOT_OCCURRED

Meaning:

Desired or compliant business outcome.

---

## NEGATIVE

Used for:

- NOT_ACHIEVED
- ABNORMAL
- OCCURRED

Meaning:

Confirmed undesired or non-compliant business outcome.

---

## NEUTRAL

Used for:

- UNDETERMINED
- UNKNOWN
- NONE
- informational absence without a confirmed compliance conclusion

Meaning:

No positive or negative conclusion should be inferred.

---

## INFORMATIONAL

Used for:

- available detail;
- navigational or interactive information.

Example:

Environmental Monitoring:
`查看`

---

# 15. UI Implementation Boundary

The Status Dictionary must not contain Tailwind classes or literal colors.

Incorrect:

`ABNORMAL → bg-red-500`

Correct:

`ABNORMAL → NEGATIVE`

Then the shared UI component decides how:

`NEGATIVE`

is visually represented.

Conceptual flow:

Business Result
→ UI Semantic Intent
→ Shared Component Variant
→ Design Token
→ Visual Appearance

---

# 16. Shared Component Rule

Pages must not independently implement status appearance.

Expected architecture:

Status / Business Result
        ↓
Shared Status Component
        ↓
Semantic Variant
        ↓
Design Tokens

For example:

`ACHIEVED`
→ `POSITIVE`

`ABNORMAL`
→ `NEGATIVE`

`UNDETERMINED`
→ `NEUTRAL`

Do not create module-specific status colors such as:

- trainingGreen
- certificateRed
- eventBlue
- actionOrange

unless a future approved design requirement explicitly requires them.

---

# 17. Unknown Status Handling

Unknown source values must follow the mapping rule of their own domain.

Event:
Any non-`Closed`
→ `OPEN`

Take Charge:
Any status outside the three confirmed Closed statuses
→ `OPEN`

Action:
Any status outside the explicitly confirmed map
→ `UNKNOWN`

Unknown values must never silently inherit rules from another domain.

Event, Action and Take Charge mappings are independent.

---

# 18. Terminology Summary

| Concept | Canonical Values | Purpose |
|---|---|---|
| Performance Result | ACHIEVED / NOT_ACHIEVED / UNDETERMINED | KPI / Goal result |
| Compliance Result | NORMAL / ABNORMAL / UNDETERMINED | Certificate / Environment compliance |
| Occurrence Result | OCCURRED / NOT_OCCURRED | ASTM Incident |
| Record State | OPEN / CLOSED / EXCLUDED / UNKNOWN | Record lifecycle/filtering |
| Availability State | NONE / AVAILABLE | Environmental Monitoring record availability |
| View Filter | OPEN_ONLY / ALL | Table/list filtering |
| UI Intent | POSITIVE / NEGATIVE / NEUTRAL / INFORMATIONAL | Shared visual semantics |

These concepts must remain separate even when their visual treatment is similar.
