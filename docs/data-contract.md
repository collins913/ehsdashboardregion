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

查询上下文按实际依赖区分：Store scope 仅含 Region / Area / canonical Store；完整 period-aware context 在此基础上增加有效 Period。Stores、Environment、Certificates 使用 Store scope，不携带虚构 Period，Period 无效不影响其查询就绪。依赖 Period 的查询继续要求完整 context。查询身份只包含实际影响结果的业务输入：Stores / Environment 仅使用 Store scope，Certificates 另包含用于有效期评价的 referenceDate；不依赖 executor identity。

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

Filter UI 使用 `Asia/Shanghai` 下的完整自然月生成该契约，默认本季度，并支持本年、本季度、本月及自定义月份范围。本季度从当前自然季度首月至当前月，本年从当年 1 月至当前月，均不纳入未来月份。Region、Area 初始为 `ALL` 且为单选，Store 初始为 `ALL` 且支持多选；层级变化时清除无效下级选择。V1 不提供部分月份或日级日期输入。日期范围与 `includedMonths` 明显不一致时 Repository 标记为 `INCOMPLETE`；KPI Builder 不推断或替换月份。

### 2.2 Store Reference

业务数据必须先解析到统一 Store，再进入规则计算。

可用的候选匹配信息：

- TRTID
- Store Name CN
- Store Name EN

约束：

- TRTID 不保证是所有数据源的唯一关联键。
- 页面和业务组件不得自行按名称或 TRTID 匹配。
- Events、Actions、Environment V1 与 Certificates V1 使用已确认的 TRTID 优先、Store English Name fallback 规则。TRTID 唯一匹配时，英文名无匹配视为可能的历史名称并接受 TRTID；英文名明确匹配另一门店时才判定冲突。其它数据源使用的字段、匹配优先级、名称规范化、重复命中与未命中处理：TBD。
- Repository 输出给 KPI 组装层的记录必须使用规范化 `storeId`。页面不得消费源 Store Reference。

### 2.3 Data Availability

KPI scoped data 必须显式区分：

| Availability | 含义 |
|---|---|
| `AVAILABLE` | 请求范围完整且存在数据 |
| `CONFIRMED_EMPTY` | 请求范围完整且确认无数据 |
| `INCOMPLETE` | 仅有部分数据或完整性无法确认 |
| `UNAVAILABLE` | 数据未提供或不可用 |

Data Availability 只描述请求 Store × Period 范围内的数据源覆盖与同步完整性，不描述该范围是否发生业务记录。过滤后数组为空本身不能证明 `CONFIRMED_EMPTY`；但数据源已明确覆盖完整时，零记录是有效业务事实并返回 `CONFIRMED_EMPTY`。ASTM 仅在完整数据集确认为空时返回 `NOT_OCCURRED`；`INCOMPLETE` 或 `UNAVAILABLE` 不产生 `OccurrenceResult`。

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

### 2.6 Async Query Boundary

`EhsRepository` 的公开能力按 KPI、Actions、Events、Take Charge、Stores、Environment、Certificates 与 Global Filters 分组，全部返回 Promise。公开接口只返回 normalized/domain result，不暴露 raw `list*` source API。

Client 传入 Server Action 的查询 DTO 仅包含 typed Store scope 或完整 period-aware context、view/filter/sorting、`pageIndex`、`pageSize`、ISO datetime string 等可序列化值。Repository factory 与 `referenceDateIso → Date` 转换只发生在 server-only 边界。

## 3. Store Master Data

当前 Store Master normalized contract 的逻辑字段：

| 字段 | 含义 | 备注 |
|---|---|---|
| Region | 门店所属 Region | 类型与字典 TBD |
| Area | 门店所属 Area | 与 Region 关系 TBD |
| Store Name CN | 门店中文名称 | 可能参与 Store Resolution |
| Store Name EN | 门店英文名称 | 可能参与 Store Resolution |
| TRTID | 内部门店标识 | 不称为 Store ID；跨源唯一性不保证 |
| Region Owner / Email | 区域负责人姓名和邮箱 | 两者分别允许 null |
| Area Owner / Email | 小区负责人姓名和邮箱 | 两者分别允许 null |
| Manager | 门店经理 | 人员标识方式 TBD |
| Manager Email | 门店经理邮箱 | 允许 null |
| EHS Ambassador | 门店 EHS Ambassador；用户可见标签为“EHS&S 代表” | 人员标识方式 TBD |
| EHS Ambassador Email | EHS&S 代表邮箱 | 允许 null |

Stores Repository 按 Global Region / Area / canonical Store scope 返回上述字段，并忽略 Period。列表默认列与 Detail 字段范围见 `business-requirements.md`。允许未来增加其它主数据字段；新增字段是否进入列表或详情仍为 TBD。

## 3A. Access Management 逻辑契约

`src/data/contracts/access/` 定义 Identity、Base Grant、Manual Grant、Effective Access、统一 Mutation Result 与 Audit Event。Email 在 Access Domain 中统一 trim + lowercase。Base Grant 从 Store 主数据实时派生，不写入 Manual Grant Repository；相同邮箱、来源类型和范围只产生一条规范化授权。Manual Grant 包含目标邮箱、权限类型、范围、授权人和时间、可选备注；更新记录保留更新人和时间。授权存在即生效，删除即失效，没有截止时间或过期状态。

GLOBAL_USER 和 GLOBAL_ADMIN 均有全局数据范围，只有 GLOBAL_ADMIN 可管理权限。REGION 继承下级 Area / Store；AREA 继承下级 Store；STORE 仅授权当前门店。服务端保留自动授权来源元数据、Effective Access、Account Summary 和可访问筛选选项；Client 不计算继承或合并。UI 在 /access 仅维护 Manual Grants，并在操作日志 Tab 追踪变更；Period 不进入 Access 查询身份。

Manual Grant Repository 的写入契约需与 append-only Audit Event 原子保存；当前 Mock 用 server-memory 模拟，Production 持久化实现待定。变更失败返回明确代码和安全文案。生产身份提供者、数据库结构与 API 物理格式未在本阶段冻结。

Create / Update / Delete Server Action 对运行时输入逐项解析：Email、Access Type、Scope ID、Note 与 mutation ID。全局类型要求 `scopeId: null`，Region / Area / Store 要求非空范围 ID；Access Service 再按组织目录核验范围，并阻止修改或删除最后一名有效 GLOBAL_ADMIN。无效输入返回 `INVALID_INPUT`，最后管理员保护返回 `LAST_GLOBAL_ADMIN`。

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
- `startInclusive`：包含时区的统计周期起点
- `endExclusive`：包含时区的统计周期终点
- Action Closure Rate Value：规范化类型为 `number | null`；数据源空值由 Repository / Adapter 转换为 `null`

Value 使用 0–100。

当 Action 数据源 Coverage 完整且当前 Store × Period 已确认没有需要整改的 Action 时，aggregate `value = null` 表示有效业务事实，结果为 `ACHIEVED`，页面显示“无”。该 `null` 不得转换为 `100%` 或数值 `0`；实际数值 `0` 显示为 `0%`。

Action 数据源不可用、Coverage 不完整或当前 Period 的 aggregate 完整性无法确认时，Data Availability 必须为 `INCOMPLETE` 或 `UNAVAILABLE`，结果为 `UNDETERMINED`，不得使用 `null` / “无”掩盖数据问题。

以下尚未确认：

- Numerator、Denominator 是否一并提供：TBD
- Source Reference 和更新时间：TBD

Repository 必须返回与完整请求 Period 对应的单一源汇总值，或明确确认该范围没有需要整改的 Action。不得将月度值平均或重算为多月结果；缺少对应汇总且不能确认无 Action 时必须标记为 `INCOMPLETE`，业务结果为 `UNDETERMINED`。

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
- Event Date
- Event Type
- ASTMInjuryIllness

`ASTMInjuryIllness = "Yes"` 表示 ASTM Incident，其它值表示非 ASTM Incident。

## 5. Performance → Goals 输入

### 5.1 Goals Summary

Repository 向页面提供两组明确分离的结果：

| 范围 | 逻辑字段 | 含义 |
|---|---|---|
| Global Period | submissionTotal / closedCount / closeRate | 当前 Submitted At 范围内的提交与关闭汇总 |
| 当前年度累计 | averageSubmissionsYtd | 当前组织范围的数据源 aggregate，1 位小数 |
| 当前年度累计 | participationRateYtd | 当前组织范围的数据源 aggregate，0 位小数 |

年度指标不携带 Global Period。多 Store、Area、Region 查询必须由数据源返回该范围 aggregate，不允许平均门店最终值。百分比统一使用 0–100。

### 5.2 Take Charge Record

Raw 公共字段：

- TRTID
- TCH ID
- Submitted By
- Submitted At（当前源为 Asia/Shanghai 本地 `YYYY-MM-DDTHH:mm:ss`）
- Summary
- Status
- Source Reference（可选）

Adapter 将 Source Submitted At 明确解释为 Asia/Shanghai，并在 normalized record 中输出带 offset 的 datetime。Normalized record 同时输出 canonical `storeId`、当前中文门店名、上述公共字段、raw Status、RecordState 与受字段定义控制的 `extraFields`。Take Charge 当前只通过 TRTID 解析门店；页面不读取 TRTID。

可扩展字段只允许 `string | number | boolean | date | datetime | null`；必须先有稳定 key、中文 label、value type 与默认隐藏定义。动态字段不得覆盖核心字段，UI 不得枚举 raw object。

### 5.3 Monthly Aggregate

数据层按 `storeId + month` 保存 `totalCount` 与 `closedCount`。多月关闭率只允许汇总这两个计数后相除。

### 5.4 Take Charge Records Query

查询输入为 `EhsFilterContext + OPEN_ONLY | ALL + sorting + pageIndex + pageSize`；Repository 输出当前页 records、`totalCount`、DataAvailability 与 field definitions。Repository 对完整 scoped result 先应用 view mode 与排序，再分页；动态扩展字段 V1 不参与排序。

今年平均提交数、今年参与率的生产源字段及人员分母定义仍由数据源契约确认；V1 mock 只通过隔离的 deterministic aggregate fixture 表达，不把 mock 公式固化为生产规则。

## 6. Risk & Compliance → Event Record

### 6.1 共同字段

| 逻辑字段 | 要求 |
|---|---|
| Event ID | 数据源提供；唯一性范围 TBD |
| Store Reference | 必须先通过 Store Resolution |
| Event Type | 数据源提供 string；当前已知 `Agency`、`Non-Agency Event`，允许未来新增值 |
| Submitted By | 数据源提供；人员标识方式 TBD |
| Event Date | 数据源提供的完整 datetime；Events Global Period 使用此字段 |
| EventDetail.Description | 数据源提供的完整事件描述 |
| Status | 数据源原始状态；V1 已确认 `Open`、`Closed` |
| Source Reference | 可选追溯来源 |
| ASTMInjuryIllness | 数据源原始字段；`Yes` 表示 ASTM Incident，其它值表示非 ASTM Incident |

`Event Date` / `eventDate` 是稳定的 source / contract 字段命名；用户可见术语统一为 `Event Time` / “事件时间”。

Events Repository 必须复用 Actions 已采用的 Store Resolution，将源 TRTID / Store English Name 转换为 canonical `storeId` 与中文 `storeDisplayName`；英文名明确匹配另一门店、重复命中或无法解析时返回 `INCOMPLETE`，历史英文名无匹配但 TRTID 唯一有效时仍正常解析。

规范化 Event 公共字段包含 canonical Store、Event ID、Event Type、Submitted By、Event Date、Description、Raw Status、RecordState 与 ASTM 源值。Event Type 专属详情字段为 TBD，不使用未约束的 `Record<string, unknown>` 向 UI 透传。

Events scoped Repository query 复用 `EhsFilterContext`，以 Event Date 应用 Asia/Shanghai 完整自然月半开区间。`OPEN_ONLY` 仅返回 `RecordState = OPEN`；`ALL` 保留当前范围全部 normalized records，包括未知未来状态的 `UNKNOWN`，不猜测为 OPEN。Event Type 是 feature-local 可选查询条件，不进入 Global Filter Context。

Events query 还接收 sorting、`pageIndex`、`pageSize`，返回当前页 records、`totalCount`、DataAvailability 及分页前从当前 Global Scope + view mode 生成的 `availableEventTypes`。

## 7. Risk & Compliance → Action Record

| 逻辑字段 | 要求 |
|---|---|
| Action ID | 数据源提供；唯一性范围 TBD |
| Store Reference | 原始 Action 可同时提供 TRTID 与 Store English Name；必须先通过 Store Resolution |
| Problem | 数据源提供 |
| Action | 数据源提供；代码字段为 `action` |
| Submitted By | 数据源提供；人员标识方式 TBD |
| Owner | 数据源提供；人员标识方式 TBD |
| Submitted Date | 数据源提供的完整 datetime；Actions 页面 Global Period 使用此字段 |
| Due Date | 数据源提供的完整 datetime |
| Closed Date | 数据源提供的完整 datetime；可为 null，表示未提供关闭时间；不得用于推断 Status |
| Status | 数据源提供原始 `string`；Repository / Adapter 解析为 `ParsedActionStatus`，未知值保留原文并标记为 `UNKNOWN` |
| Source Reference | 数据源可选提供 |

当前已知 Status：

- Assigned
- In Progress
- In Review
- Sign Off
- Closed
- Cancelled

Repository / Adapter 必须保留 Raw Status，并集中解析为 `ParsedActionStatus`。`Assigned`、`In Progress`、`In Review`、`Sign Off` 归类为 `OPEN`；`Closed` 归类为 `CLOSED`；`Cancelled` 归类为 `EXCLUDED`。数据源可增加其它状态，但在集中映射确认前一律归类为 `UNKNOWN`，不得由 UI 猜测。

Actions 数据源的 Store Resolution 顺序为：TRTID 唯一匹配优先；TRTID 缺失或无法匹配时使用 Store English Name 精确唯一匹配。TRTID 唯一有效且英文名无匹配时接受 TRTID，以兼容历史改名；只有英文名明确匹配另一门店时判定冲突。冲突、重复命中或无法解析时不得静默选择或丢弃，Repository 将查询标记为 `INCOMPLETE`。规范化查询输出仅包含 canonical `storeId` 与中文 `storeDisplayName`，不向页面暴露 TRTID 或 Store English Name。

Actions scoped Repository query 复用 `EhsFilterContext`，以 Submitted Date 应用 Asia/Shanghai 完整自然月半开区间。`OPEN_ONLY` 仅返回集中解析后的 `RecordState = OPEN`；`ALL` 保留 `OPEN`、`CLOSED`、`EXCLUDED`、`UNKNOWN`。KPI Action 下钻与 Actions 页面 Open 视图必须复用同一 `OPEN_ONLY` 查询。

Actions query 还接收 sorting、`pageIndex`、`pageSize`，Repository 对完整 scoped result 先应用 Period、view mode 与排序，再返回当前页、`totalCount` 和 DataAvailability。

## 8. Risk & Compliance → Certificates

### 8.1 Raw Source

仅七字段：TRTID、English Store Name、Certificate Type、Expiry Date、Person、Person Email、Business Title。Expiry Date 为 date-only 源字符串或 null，允许保留无效字符串用于异常原因。无中文门店名、源 Category、证号、发证日期、Source Reference 或 Required Slot。

### 8.2 Normalized contract

每张记录提供 canonical storeId、中文 storeDisplayName、certificateCategory、certificateType、person、personEmail、businessTitle、expiryDate、daysUntilExpiry、certificateStatus、certificateReason。Raw 门店引用不暴露给 UI。

Category 为安全健康、急救员、特种作业、安全驾驶；未知 Type 的 Category 为 null，保留完整 normalized record，独立于四类别汇总输出，不参与其评价。Type exact mapping 见业务需求与集中规则；不使用别名或人员岗位推断。

单证状态仅 NORMAL / ABNORMAL；Reason 为 NORMAL、EXPIRED、MISSING_EXPIRY_DATE、INVALID_EXPIRY_DATE。日期无效或缺失时天数为 null，状态异常。天数使用 Dashboard referenceDate 的 Asia/Shanghai 业务日期做自然日差。

每个 scoped Store 的结果包含四类别 summary（类别、状态、normalized records），即使无证件也保留门店及空类别。类别无记录或任一单证异常则 ABNORMAL，否则 NORMAL。

### 8.3 Query 与 Detail

复用现有 Store Resolution：TRTID primary、English Store Name fallback，保留 conflict / historical-name / duplicate / unresolved 语义。Region / Area / canonical Store 生效，Period ignored。查询使用现有 Data Availability 表达源解析完整性，不额外创造证件业务状态。

Detail Header：中文门店、类别、类别状态。按当前 records 的实际 Type 形成纵向 sections，每个 Type 下全部记录使用纵向 cards 展示 Person、Person Email、Business Title、Expiry Date、距离到期天数、单证状态；Type 只作为 section heading。新 normalized Type 自动追加，同 Type 多记录不去重或覆盖。未来新增字段必须显式扩展 typed contract 和 presentation。不实现 Required Slot 完整性或到期提醒。

## 9. Risk & Compliance → Environment

### 9.0 Environment Detail 契约

Raw Source 顶层保留：`TRTID`、`English Store Name`、`环境影响评价`、`排污许可`、`排水许可`、`环境预案`、`监测`、`废弃物合同`。Raw 不保存中文门店名或业务结果；自由文本字段不限制为状态枚举。

- 环境影响评价：评价自由文本；总量要求含气-颗粒物、气-VOCs、水-氨氮、水-总氮、水-总磷、水-CODcr，均为 nullable 数值，单位吨/年。
- 排污许可：许可自由文本、执行报告、编号、有效期起止、产能、涂料批复用量、备注。产能与涂料批复用量保留 source-like typed value，不预设单位。
- 排水许可：洗车、许可自由文本、有效期起止、备注。
- 环境预案：备案情况、备案编号、有效期起止、备注；不含其它未定义字段。
- 监测：暂时保留当前“有 / 无 / 不适用”源值，其余字段 TBD。
- 废弃物合同：危险废物、一般工业固体废物两个数组；每条记录含供应商名称、种类、有效期起止。数组保持全部源记录及顺序，不去重、不限数量。

Normalized output：canonical `storeId`、Store Master 中文 `storeDisplayName`、`facilityInformation`、`environmentalLicenses`（环境影响评价 / 排污许可 / 排水许可）、`emergencyPlan`、`monitoring`、`wasteContracts`。设施信息当前为 TBD 空结构；不向 UI 暴露 Raw Store Reference。使用已有 `resolveStoreReference` 的 TRTID primary、English Store Name fallback、conflict 与 historical-name 规则，不假设源 TRTID 等于 canonical storeId。

Environment query 接收 typed Store scope，仅使用 Region / Area / canonical Store，不要求 Period。结果使用现有 Data Availability 表达数据完整性；缺失记录或无法解析的源记录不得补成“无”。

主表仅提供门店与五个详情入口。一个 Detail Sheet 按明确 typed contract 展示设施信息、环保证照、应急预案、监测或废弃物合同；日期仅展示，不计算过期。Environment 不输出 Business Result，也不套用既有合规规则。

以下 9.1–9.5 保留既有合规输入需求，**不属于当前状态 V1 的源字段或实现范围**；后续扩展必须另行确认。

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
| Certificate Business Result | V1 仅 `NORMAL`、`ABNORMAL`；单证附标准 Reason Code |
| Environment normalized detail | 显式 typed 的源信息；自由文本、日期和合同记录不作业务归类 |
| Environment Business Result | 当前不提供；既有合规需求独立于本次 Detail Expansion |

字段命名、枚举编码和错误返回结构：TBD。

KPI 页面使用集中 Builder 输出的 `KpiRow[]`。每行只包含规范化门店身份、Training、Drill、Actions、Inspections 和 ASTM Events 的汇总结果及 Data Availability，不嵌入 Action 明细。Action 下钻按需调用统一 Actions Repository `OPEN_ONLY` 查询，并按当前 Region / Area / Store 及 Submitted Date Period 过滤；`EXCLUDED`、`UNKNOWN` 和 `CLOSED` 不进入。Closure Rate aggregate 仍使用独立的精确 Period scope，不能从下钻明细重算。
