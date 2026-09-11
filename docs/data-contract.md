# EHS Dashboard 逻辑数据契约

- 版本：V1（整理版）
- 日期：2026-09-10
- 状态：实现前的逻辑数据需求；不是数据库或 API 物理 Schema

## 1. 文档职责

本文定义业务规则成立所必需的数据对象、逻辑字段、来源责任与关联边界。

除非明确写明，以下内容均未冻结：

- 数据库表名与物理字段名
- 字段类型、长度、精度、枚举编码、空值约束
- 主键、外键、索引与唯一性约束
- API 路由与请求/响应结构
- 数据来源系统、刷新频率与持久化方式

开发不得把本文中的展示名称直接当作已确认的数据库字段。

## 2. 通用数据边界

### 2.1 Global Filter Context

业务查询上下文包含：

- Region
- Area
- Store
- Period

KPI 组装层当前使用最小规范化查询契约：

- Region、Area、Store 均显式表达 `ALL` 或非空选择集合；
- Store 使用规范化 `storeId`；
- Period 提供半开区间 `[startInclusive, endExclusive)`；
- `startInclusive`、`endExclusive` 必须携带 `Z` 或明确 UTC offset；
- Period 必须显式提供 `includedMonths`。

Filter UI 使用 `Asia/Shanghai` 下的完整自然月生成该契约，默认本季度，并支持本年、本季度、本月及自定义月份范围。Region、Area 初始为 `ALL` 且为单选，Store 初始为 `ALL` 且支持多选；层级变化时清除无效下级选择。V1 不提供部分月份或日级日期输入。日期范围与 `includedMonths` 明显不一致时 Repository 标记为 `INCOMPLETE`；KPI Builder 不推断或替换月份。

### 2.2 Store Reference

业务数据必须先解析到统一 Store，再进入规则计算。

可用的候选匹配信息：

- TRTID
- Store Name CN
- Store Name EN

约束：

- TRTID 不保证是所有数据源的唯一关联键。
- 页面和业务组件不得自行按名称或 TRTID 匹配。
- 每个数据源使用的字段、匹配优先级、名称规范化、重复命中与未命中处理：TBD。
- Repository 输出给 KPI 组装层的记录必须使用规范化 `storeId`。页面不得消费源 Store Reference。

### 2.3 Data Availability

KPI scoped data 必须显式区分：

| Availability | 含义 |
|---|---|
| `AVAILABLE` | 请求范围完整且存在数据 |
| `CONFIRMED_EMPTY` | 请求范围完整且确认无数据 |
| `INCOMPLETE` | 仅有部分数据或完整性无法确认 |
| `UNAVAILABLE` | 数据未提供或不可用 |

过滤后数组为空本身不能证明 `CONFIRMED_EMPTY`。ASTM 仅在完整数据集确认为空时返回 `NOT_OCCURRED`；`INCOMPLETE` 或 `UNAVAILABLE` 不产生 `OccurrenceResult`。

当 Store 为 `ALL` 时，完整性校验必须展开当前 Region / Area 范围内实际规范化 `storeId`；任一门店没有覆盖声明时，请求数据集不得标记为 `CONFIRMED_EMPTY`。

### 2.4 Source Reference

原文件中的 `Source / Link` 统一称为 `Source Reference`。其目的仅为追溯业务记录来源。

Source Reference 为可选结构，可包含：

- `sourceSystem`
- `sourceRecordId`
- `sourceUrl`

各字段可缺失或为空，不要求每条记录提供 URL。不得在 mock 数据中创建虚假生产 URL。链接格式和访问权限仍为 TBD。

### 2.5 Status 分层

数据契约区分：

- Source Status：Actions、Events 等数据源提供的原始状态。
- Display Status：页面展示用状态或原因文案。
- Business Result：规则引擎输出的业务归类。

三个概念不得共用一个含义不明的 `Status` 字段。

## 3. Store Master Data

当前默认显示的逻辑字段：

| 字段 | 含义 | 备注 |
|---|---|---|
| Region | 门店所属 Region | 类型与字典 TBD |
| Area | 门店所属 Area | 与 Region 关系 TBD |
| Store Name CN | 门店中文名称 | 可能参与 Store Resolution |
| Store Name EN | 门店英文名称 | 可能参与 Store Resolution |
| TRTID | 内部门店标识 | 不称为 Store ID；跨源唯一性不保证 |
| Manager | 门店经理 | 人员标识方式 TBD |
| EHS Ambassador | 门店 EHS Ambassador | 人员标识方式 TBD |

允许未来增加其它主数据字段。新增字段是否默认显示：TBD。

## 4. Performance → KPI 输入

### 4.1 Training Record

规则所需最小逻辑信息：

- Store Reference
- Month
- Training Name
- 是否属于当月要求完成的培训，或由数据源保证仅返回要求集合
- 全员完成结果或足以得出该结果的数据

以下尚未确认：

- 具体 Source Status 值：TBD
- 未完成人员明细是否提供：TBD
- Source Reference 是否提供：TBD
- Requirement 集合的来源：TBD

### 4.2 Drill Record

规则所需最小逻辑信息：

- Store Reference
- Month
- Drill Name
- 完成结果

以下尚未确认：

- 演练记录的唯一标识：TBD
- 完成状态字典：TBD
- Source Reference 是否提供：TBD

### 4.3 Action Closure Rate

数据源直接提供：

- Store Reference
- Period
- Action Closure Rate Value：规范化类型为 `number | null`；数据源空值由 Repository / Adapter 转换为 `null`

Value 使用 0–100。

`null` 在页面显示为“无”，不得转换为数值 `0`；实际数值 `0` 显示为 `0%`。

以下尚未确认：

- Numerator、Denominator 是否一并提供：TBD
- Source Reference 和更新时间：TBD

Repository 必须返回与完整请求 Period 对应的单一源汇总值。不得将月度值平均或重算为多月结果；没有对应汇总时返回 `value = null`，业务结果为 `UNDETERMINED`。

### 4.4 Inspection Record

规则所需最小逻辑信息：

- Store Reference
- 当前 Period 内要求完成的 Inspection
- Inspection 的完成结果

以下尚未确认：

- Inspection ID 或名称：TBD
- Requirement 集合的来源：TBD
- 完成状态字典：TBD
- 日期与 Source Reference：TBD

### 4.5 ASTM Incident 输入

不建立独立 ASTM 数据集。使用第 6 节 Event Record：

- Store Reference
- Event Date Time
- Event Type
- ASTMInjuryIllness

`ASTMInjuryIllness = "Yes"` 表示 ASTM Incident，其它值表示非 ASTM Incident。Severity 不参与判定。

## 5. Performance → Goals 输入

### 5.1 Goal Summary

数据源按当前筛选范围直接提供三个值：

| 逻辑字段 | 含义 | 展示精度 |
|---|---|---|
| Take Charge Submissions per Capita | 人均提交数 | 1 位小数 |
| Take Charge Close Rate | 关闭率 | 0 位小数 |
| Take Charge Participate Rate | 参与率 | 0 位小数 |

每个值还必须能够关联：

- Store Reference
- Period

百分比值统一使用 0–100。空值、更新时间与 Source Reference：TBD。

### 5.2 Take Charge Record

人均提交数与 Close Rate 点击明细至少需要：

- Store Reference
- 提交人
- 提交日期
- 摘要
- Status
- Source Reference

Take Charge 使用源字段 `Status`。`ClosedWithAction`、`ClosedWithoutAction`、`Declined` 归类为 Closed，其它值归类为 Open。

### 5.3 Take Charge Participation Record

参与率点击明细至少需要：

- Store Reference
- 人员姓名
- 是否提交
- Source Reference

人员唯一标识、人员范围及是否提交的计算来源：TBD。

## 6. Risk & Compliance → Event Record

### 6.1 共同字段

| 逻辑字段 | 要求 |
|---|---|
| Event ID | 数据源提供；唯一性范围 TBD |
| Store Reference | 必须先通过 Store Resolution |
| Event Date Time | 日期和时间为一个字段；格式与时区 TBD |
| Event Type | `Agency`（政府检查）或 `Non-Agency Event`（非政府检查事件） |
| Title / Summary | 事件或检查摘要 |
| Status | 数据源原始状态；`Closed` 表示 Closed，其它值表示 Open |
| Source Reference | 可选追溯来源 |
| ASTMInjuryIllness | 数据源原始字段；`Yes` 表示 ASTM Incident，其它值表示非 ASTM Incident |

### 6.2 Non-Agency Event 附加字段

- Severity

Severity 仅用于事件详情展示，不参与 ASTM Incident 判定。

政府检查是否也可能提供 Severity：未要求，TBD。

## 7. Risk & Compliance → Action Record

| 逻辑字段 | 要求 |
|---|---|
| Action ID | 数据源提供；唯一性范围 TBD |
| Store Reference | 必须先通过 Store Resolution |
| Action Title | 数据源提供 |
| Owner | 数据源提供；人员标识方式 TBD |
| Created Date | 数据源提供 |
| Due Date | 数据源提供 |
| Closed Date | 数据源提供；可为 null，表示未提供关闭日期；不得用于推断 Status |
| Status | 数据源提供原始 `string`；Repository / Adapter 解析为 `ParsedActionStatus`，未知值保留原文并标记为 `UNKNOWN` |
| Source Reference | 数据源可选提供 |

当前已知 Status：

- Closed
- Cancelled
- Assigned
- InProgress

数据源可增加其它状态，但其 Open 分类必须先进入业务规则。

## 8. Risk & Compliance → Certificates

### 8.1 Certificate Record

至少需要：

- Store Reference
- Certificate Category
- Certificate Type
- Person
- Role / Title
- Expiry Date；可为 null。缺失且没有更早的异常结论时，业务结果为 `UNDETERMINED`，原因为 `MISSING_EXPIRY_DATE`
- Source Reference（可选）

数据源如有可额外提供：

- Certificate Number
- Issue Date

数据源不提供最终业务结论。证件规则只返回规范化 Business Result 与 Reason Code；Display Status 由展示层映射。

### 8.2 Certificate Requirement

Slot 匹配另需一套逻辑要求数据：

- Certificate Category
- Required Slot
- Slot 可匹配的 Certificate Type

Required Slot 仅按 Certificate Type 精确匹配；不使用 Person、Role / Title。一个证件记录只能匹配一个 Slot。

| Certificate Category | Required Slot | 可匹配 Certificate Type |
|---|---|---|
| 安全证书 | S | `主要负责人安全生产培训合格证书-S`、`店长安全证` |
| 安全证书 | M | `安全生产管理人员安全生产培训合格证书-M`、`EHS RN安全证` |
| 职业卫生证书 | H1 | `主要负责人职业卫生培训合格证书-H1`、`职业健康证` |
| 职业卫生证书 | H2 | `职业卫生管理人员职业卫生培训合格证书-H2`、`职业健康证` |
| 急救员 | First Aid | `急救员证`、`红十字急救员` |
| 焊工证 | Welding | `熔化焊接与热切割作业`、`焊工证` |
| 内驾证 | Trainer | `内训师` |
| 内驾证 | Internal Driving | `内驾证` |

不使用别名或模糊匹配。Requirement 的来源与维护方式仍为 TBD。

### 8.3 证件类别

V1 默认类别：

- 安全证书
- 职业卫生证书
- 急救员
- 焊工证
- 内驾证

类别字典需支持扩展；编码方式：TBD。

## 9. Risk & Compliance → Environment

### 9.1 Waste Contract Record

至少需要：

- Store Reference
- Contract Category
- Supplier / Contractor
- Expiry Date；可为 null
- Source Reference（可选）

Contract Category 至少能区分：

- Hazardous Waste Contract
- General Solid Waste Contract

合同编号、生效日期、重复记录和多份合同适用关系：TBD。

### 9.2 Car Wash / Drainage Permit

至少需要：

- Store Reference
- Has Car Wash
- Has Drainage Permit
- Permit Expiry Date；可为 null
- Source Reference（可选）

布尔值编码、空值与不适用值：TBD。

### 9.3 EIA

至少需要：

- Store Reference
- EIA Required
- EIA Information
- Source Reference（可选）

EIA Required 的布尔值编码，以及 EIA Information 的最小有效结构：TBD。

EIA 不需要 Expiry Date。

### 9.4 Discharge Permit

至少需要：

- Store Reference
- Discharge Permit Required
- Permit Information
- Expiry Date；可为 null
- Source Reference（可选）

Required 的布尔值编码与 Permit Information 的最小有效结构：TBD。

### 9.5 Environmental Monitoring Record

当前只要求数据层能够按 Store Reference 表示记录存在，并支持点击后读取明细。

除 Store Reference 外，明细字段、监测结果、频次、日期、机构和 Source Reference：TBD，待真实数据源确认。

## 10. 规则结果输出边界

后端或集中业务层应向页面提供规范化结果；具体 API Schema 尚未确定。

至少需要区分以下概念：

| 结果 | 必要含义 |
|---|---|
| KPI Result | 达成/未达成、发生/未发生或直接数值 |
| Goal Result | 直接值及按已确认阈值得出的达成结果 |
| Certificate Display Status | 由展示层根据规范化结果与原因映射 |
| Certificate Business Result | `NORMAL`、`ABNORMAL`、`UNDETERMINED`，并附标准 Reason Code |
| Environment Display Status | 类别结果；监测为无/查看 |
| Environment Business Result | 已定义类别的正常/异常；Environmental Monitoring 不因记录存在性输出此结果 |

字段命名、枚举编码和错误返回结构：TBD。

KPI 页面使用集中 Builder 输出的 `KpiRow[]`。每行包含规范化门店身份、Training、Drill、Actions、Inspections 和 ASTM Events 的结果及 Data Availability。Actions 同时提供该门店 `RecordState = OPEN` 的明细；`EXCLUDED`、`UNKNOWN` 和 `CLOSED` 不进入 `openActions`。
