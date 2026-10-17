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
- Area 使用共享 `areaScopeId(region, area)`（JSON 编码的 `[region, area]`），不得用显示名称作为筛选值；同名小区跨区域保持独立，Store DTO 的 `area` 仍是显示名称；
- Period 提供半开区间 `[startInclusive, endExclusive)`；
- `startInclusive`、`endExclusive` 必须携带 `Z` 或明确 UTC offset；
- Period 必须显式提供 `includedMonths`。

Filter UI 使用 `Asia/Shanghai` 下的完整自然月生成该契约，默认本年，并支持本年、本季度、本月及自定义月份范围。本季度从当前自然季度首月至当前月，本年从当年 1 月至当前月，均不纳入未来月份。Region、Area 初始为 `ALL` 且为单选，Store 初始为 `ALL` 且支持多选；层级变化时清除无效下级选择。V1 不提供部分月份或日级日期输入。日期范围与 `includedMonths` 明显不一致时 Repository 标记为 `INCOMPLETE`；KPI Builder 不推断或替换月份。

### 2.2 Store Reference

业务数据必须先解析到统一 Store，再进入规则计算。

所有业务源统一使用以下 source identity：

- TRTID
- English Store Name（optional fallback）

约束：

- TRTID 是正式门店主标识；English Store Name 仅作可选 fallback。
- 所有业务域统一通过同一个 Store Resolution：TRTID primary；TRTID 缺失或无法唯一解析时，English Store Name 精确唯一 fallback；明确冲突、重复命中或无法解析时不得静默选择。
- Store Master 是当前快照；历史报表按当前组织归属解析。本阶段不引入 effectiveFrom / effectiveTo 或历史组织版本。
- canonical `storeId` 由 Repository / normalization 生成，业务源不得提供。
- 页面和业务组件不得自行按名称或 TRTID 匹配。
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

### 2.6 Null、Blank 与 Invalid

blank / null 表示缺失；invalid date 保留为 invalid，不自动修正；缺少 required source column 属于 structural / data contract error。不得把 blank 转为 No、0、Normal 或 Achieved，也不得把 invalid date 替换为 today。required 状态按逐字段 contract 确认，本原则不把所有字段变成 required。Open-text 原文保留；闭合 enum 未知值沿现有 `UNKNOWN` / `INCOMPLETE` / Data Availability 语义处理，不映射为默认值。

业务记录编号（如 Event ID、Action ID、TCH ID、Inspection Number）仅要求在各自业务域内唯一，不建立跨域全局编号。重复编号是数据质量问题；Repository 与 UI 保留全部源记录，不静默去重、合并或折叠。

### 2.7 Async Query Boundary

`EhsRepository` 的公开能力按 KPI、Actions、Events、Take Charge、Stores、Environment、Certificates 与 Global Filters 分组，全部返回 Promise。公开接口只返回 normalized/domain result，不暴露 raw `list*` source API。

Client 传入 Server Action 的查询 DTO 仅包含 typed Store scope 或完整 period-aware context、view/filter/sorting、`pageIndex`、`pageSize`、ISO datetime string 等可序列化值。Repository factory 与 `referenceDateIso → Date` 转换只发生在 server-only 边界。Production 的业务日期固定来自服务端可信时钟并按 `Asia/Shanghai` 解释；Client timestamp 不能覆盖它。Mock 仍可注入日期以保持测试确定性。

## 3. Store Master Data

当前 Store Master normalized contract 的逻辑字段：

| 字段 | 含义 | 备注 |
|---|---|---|
| Region | 门店所属 Region | 类型与字典 TBD |
| Area | 门店所属 Area | 与 Region 关系 TBD |
| Store Name CN | 门店中文名称 | 仅用于展示，不参与 Store Resolution |
| Store Name EN | 门店英文名称 | 可能参与 Store Resolution |
| TRTID | 正式门店业务主标识 | 不是 canonical `storeId`；由统一 Store Resolution 解析 |
| Region Owner / Email | 区域负责人姓名和邮箱 | 两者分别允许 null |
| Area Owner / Email | 小区负责人姓名和邮箱 | 两者分别允许 null |
| Manager | 门店经理 | 人员标识方式 TBD |
| Manager Email | 门店经理邮箱 | 允许 null |
| EHS Ambassador | 门店 EHS Ambassador；用户可见标签为“EHS&S 代表” | 人员标识方式 TBD |
| EHS Ambassador Email | EHS&S 代表邮箱 | 允许 null |

Stores Repository 按 Global Region / Area / canonical Store scope 返回上述字段，并忽略 Period。列表默认列与 Detail 字段范围见 `business-requirements.md`。额外展示字段通过可选 `extraFields: Record<string, string | number | boolean | null>` 提供，字段名直接作显示名。Stores query 在服务端已授权的范围内生成 `fieldDefinitions`，包含已接入标准字段及当前范围实际存在的扩展字段；内部 canonical storeId 不作为可选列。UI 动态生成列，除原有默认字段外均默认隐藏；详情保留这些扩展字段，空值显示 `—`。

## 3A. Access Management 逻辑契约

`src/data/contracts/access/` 定义 Identity、Base Grant、Manual Grant、Effective Access、统一 Mutation Result 与 Audit Event。Email 在 Access Domain 中统一 trim + lowercase。Base Grant 从 Store 主数据实时派生，不写入 Manual Grant Repository；相同邮箱、来源类型和范围只产生一条规范化授权。Manual Grant 包含目标邮箱、可选姓名 `name`、权限类型、范围、授权人和时间、可选备注；更新记录保留更新人和时间。授权存在即生效，删除即失效，没有截止时间或过期状态。

GLOBAL_USER 和 GLOBAL_ADMIN 均有全局数据范围，只有 GLOBAL_ADMIN 可管理权限。REGION 继承下级 Area / Store；AREA 继承下级 Store；STORE 仅授权当前门店。服务端保留自动授权来源元数据、Effective Access、Account Summary 和可访问筛选选项；Client 不计算继承或合并。UI 在 /access 仅维护 Manual Grants，并在操作日志 Tab 追踪变更；Period 不进入 Access 查询身份。

Manual Grant Repository 的写入契约需与 append-only Audit Event 原子保存；当前 Mock 用 server-memory 模拟，Production 持久化实现待定。变更失败返回明确代码和安全文案。生产身份提供者、数据库结构与 API 物理格式未在本阶段冻结。

Create / Update / Delete Server Action 对运行时输入逐项解析：Email、可选 Name（string / null）、Access Type、Scope ID、Note 与 mutation ID。全局类型要求 `scopeId: null`，Region / Area / Store 要求非空范围 ID；Access Service 再按组织目录核验范围，并阻止修改或删除最后一名有效 GLOBAL_ADMIN。无效输入返回 `INVALID_INPUT`，最后管理员保护返回 `LAST_GLOBAL_ADMIN`。

## 4. Performance → KPI 输入

### 4.1 Training Record

Source grain：一行 = 门店 × Training Item × Month。

Source fields：TRTID、English Store Name（optional fallback）、`trainingName`、`month`（`YYYY-MM`）、`completionRate`、`incompletePeople`。其中 `completionRate` 与 `incompletePeople` 是 source-provided；Dashboard 不按人数计算完成率，也不从人员明细重建未完成人员。

Source 不包含 `isRequired` 或等价必检标记，也不需要补充必检任务清单。培训与检查仅评价当前 Store × Period 实际收到的记录，不要求每月有记录、不检查项目或任务清单齐全，也不要求两类记录同时存在。培训所有已有记录 completionRate = 100、检查所有已有记录 status 规范化后精确为“已完成”则达成；任一有效记录未完成则进行中。整个范围经确认完整且零记录时视为无待办，达成并计满分。已有记录必要字段为空或格式错误、来源不可用或覆盖不完整仍为未确定，并保留具体诊断。Source coverage 单独表达。Store identity 使用通用 TRTID primary / English Store Name optional fallback。

### 4.2 Drill Record

规则所需最小逻辑信息：

- Store Reference
- TRTID；English Store Name 为 optional fallback
- Month
- Drill Name
- Source Status：开放文本，保留规范化后的源文案
- 缺失或空状态必须保留为 unavailable，不得视为未完成

只有规范化后的 Source Status 精确等于 `已完成` 才视为完成；其它非空 Source Status 对 KPI 评价视为未完成。该字段不是闭合枚举。

以下尚未确认：

- 演练记录的唯一标识：TBD
- Source Reference 是否提供：TBD

Source grain：一行代表门店 × Drill Item × Month。当前无正式记录 ID；重复记录语义尚未作为 source ID 契约定义。

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

Source grain：一行 = 一家门店 × 一个 Inspection Item × 一次具有 dueDate 的 Inspection record。

Source fields：`inspectionNumber`、TRTID、English Store Name（optional fallback）、`inspectionName`、`dueDate`（date-only `YYYY-MM-DD` 或 null）、`inspector`（string 或 null）、`status`（开放文本或 null）。Inspection source 不提供 `month`；Repository 使用严格校验后的 date-only `dueDate`，按 Asia/Shanghai 业务日派生月份并应用 Global Period。缺失或无效日期无法确定 Period membership，相关数据标记为 `INCOMPLETE`。`inspectionNumber` 由 source 提供，在 Inspection domain 内唯一；mock 使用确定性 `INP-XXXXX`。Production Dashboard 不生成编号。

Source 不包含 `isRequired` 或等价必检标记，也不需要补充必检任务清单。培训与检查仅评价当前 Store × Period 实际收到的记录，不要求每月有记录、不检查项目或任务清单齐全，也不要求两类记录同时存在。培训所有已有记录 completionRate = 100、检查所有已有记录 status 规范化后精确为“已完成”则达成；任一有效记录未完成则进行中。整个范围经确认完整且零记录时视为无待办，达成并计满分。已有记录必要字段为空或格式错误、来源不可用或覆盖不完整仍为未确定，并保留具体诊断。

Mock V1 的 KPI 与 Overview 共用 required-set Domain Result；KPI 按所选范围已有记录评价，月度 contribution 直接映射该月已有记录结果；完整空月份为达成。重复编号是 data-quality issue；明细必须全量保留，禁止静默去重、合并或折叠。

培训详情 DTO 由服务端复用集中完成率规则生成 `completionResult: PerformanceResult`：有效完成率 100 → ACHIEVED，有效完成率不足 100 → NOT_ACHIEVED，空或非法 → UNDETERMINED。该字段仅供详情卡片标签展示，上游无需提供；原 completionRate / incompletePeople 保持源值，KPI 汇总和诊断规则不变。

演练与检查详情 DTO 增加内部派生字段 `completionResult: PerformanceResult`，由服务端 Repository 复用既有 source-status completion 规则生成（已完成 → ACHIEVED，其他非空 → NOT_ACHIEVED，空 → UNDETERMINED）。UI 只消费该字段选择共享状态样式，标签仍保留源 `status` 原文；此字段不要求上游填写，也不改变 KPI 汇总口径。

### 4.5 ASTM Incident 输入

不建立独立 ASTM 数据集。使用第 6 节 Event Record：

- Store Reference
- Event Date
- Event Type
- ASTMInjuryIllness

`ASTMInjuryIllness` 是闭合 source enum：`Yes` 表示 ASTM Incident，`No` 表示非 ASTM Incident。未知值不得按 No 处理；对应 scoped data 标记 `INCOMPLETE`，ASTM KPI 不输出 occurrence 结论。

## 5. Performance → Goals 输入

### 5.1 Goals Summary

Repository 向页面提供两组明确分离的结果：

| 范围 | 逻辑字段 | 含义 |
|---|---|---|
| Global Period | submissionTotal / closedCount / closeRate | 当前 Submitted At 范围内的提交与关闭汇总 |
| 当前年度累计 | submissionsPerCapitaYtd | 当前组织范围的数据源人均提交数 aggregate，至少 1 位、最多 2 位小数，超出截断 |
| 当前年度累计 | participationRateYtd | 当前组织范围的数据源 aggregate，最多 2 位小数，超出截断 |

`submissionsPerCapitaYtd` 与 `participationRateYtd` 由 upstream / company Production Repository Adapter 提供 aggregate，Dashboard 不从明细重新计算。年度指标不携带 Global Period。多 Store、Area、Region 查询必须返回该授权范围的 aggregate，不允许平均门店最终值。`submissionsPerCapitaYtd >= 4`、`participationRateYtd >= 50` 为达成；关闭率字段为 `closeRate`，目标为 `>= 90`。百分比统一使用 0–100。Goals 关闭率与参与率最多展示 2 位小数，人均提交数至少 1 位、最多 2 位；超出精度截断，达成判断始终使用原值。公司物理字段名由 Adapter 映射到这些英文逻辑字段；Dashboard 不定义公司表字段或反推 denominator。

### 5.2 Take Charge Record

Raw 公共字段：

- TRTID
- English Store Name（optional fallback）
- TCH ID
- Submitted By
- Submitted At（当前源为 Asia/Shanghai 本地 `YYYY-MM-DDTHH:mm:ss`）
- Summary
- Status
- Source Reference（可选）

Adapter 将 Source Submitted At 明确解释为 Asia/Shanghai，并在 normalized record 中输出带 offset 的 datetime。Normalized record 同时输出 canonical `storeId`、当前中文门店名、上述公共字段、raw Status、RecordState 与受字段定义控制的 `extraFields`。Take Charge 与其它业务域统一使用 TRTID primary / English Store Name optional fallback；页面不读取源门店标识。

可扩展字段只允许 `string | number | boolean | date | datetime | null`；必须先有稳定 key、中文 label、value type 与默认隐藏定义。动态字段不得覆盖核心字段，UI 不得枚举 raw object。

### 5.3 Monthly Aggregate

数据层按 `storeId + month` 保存 `totalCount` 与 `closedCount`。多月关闭率只允许汇总这两个计数后相除。

### 5.4 Take Charge Records Query

查询输入为 `EhsFilterContext + OPEN_ONLY | ALL + sorting + pageIndex + pageSize`；Repository 输出当前页 records、`totalCount`、DataAvailability 与 field definitions。Repository 对完整 scoped result 先应用 view mode 与排序，再分页；动态扩展字段 V1 不参与排序。

年度 aggregate 的物理字段名由上游接口决定，mock fixture 不是生产 schema，也不得作为 Excel 原始记录列。参与率 denominator 未由本次确认给出；本轮不从明细推导。

## 6. Risk & Compliance → Event Record

### 6.1 共同字段

| 逻辑字段 | 要求 |
|---|---|
| Event ID | 数据源提供；Event domain 内唯一；重复编号属于 data-quality issue，查询全量保留 |
| Store Reference | TRTID primary，English Store Name optional fallback；统一通过 Store Resolution |
| Event Type | 数据源提供开放 string；原文保留，允许未来新增值 |
| Submitted By | 数据源提供；人员标识方式 TBD |
| Event Date | 数据源提供的完整 datetime；Events Global Period 使用此字段 |
| EventDetail.Description | 数据源提供的完整事件描述 |
| Status | 数据源原始状态；V1 已确认 `Open`、`Closed` |
| Source Reference | 可选追溯来源 |
| ASTMInjuryIllness | 闭合 enum：`Yes` / `No`；未知值导致 scoped coverage `INCOMPLETE`，不得按 `No` 处理 |

`Event Date` / `eventDate` 是稳定的 source / contract 字段命名；用户可见术语统一为 `Event Time` / “事件时间”。

Events Repository 必须复用 Actions 已采用的 Store Resolution，将源 TRTID / Store English Name 转换为 canonical `storeId` 与中文 `storeDisplayName`；英文名明确匹配另一门店、重复命中或无法解析时返回 `INCOMPLETE`，历史英文名无匹配但 TRTID 唯一有效时仍正常解析。

规范化 Event 公共字段包含 canonical Store、Event ID、Event Type、Submitted By、Event Date、Description、Raw Status、RecordState 与 ASTM 源值。Event Type 专属详情字段为 TBD，不使用未约束的 `Record<string, unknown>` 向 UI 透传。

Events scoped Repository query 复用 `EhsFilterContext`，以 Event Date 应用 Asia/Shanghai 完整自然月半开区间。`OPEN_ONLY` 仅返回 `RecordState = OPEN`；`ALL` 保留当前范围全部 normalized records，包括未知未来状态的 `UNKNOWN`，不猜测为 OPEN。Event Type 是 feature-local 可选查询条件，不进入 Global Filter Context。

Events query 还接收 sorting、`pageIndex`、`pageSize`，返回当前页 records、`totalCount`、DataAvailability 及分页前从当前 Global Scope + view mode 生成的 `availableEventTypes`。

Events Analytics 使用独立的 context-only Repository query，不接收 Events 表格筛选、排序或分页条件。`EventAnalyticsResult` 返回 ALL scope 的事件总数、按数量降序的事件类型计数、OPEN / CLOSED 汇总及关闭率，以及覆盖 `EhsFilterContext.period.includedMonths` 的逐月事件数量与关闭率。`trendSeries` 预计算 ALL 与当前查询范围内各 Event Type 的逐月数量；每条序列覆盖全部 included months，缺失月份为 0 并按月份升序。UNKNOWN 保留在总数和类型分布中，但不进入关闭率分母；没有可评价的 OPEN / CLOSED 记录时关闭率为 null。

## 7. Risk & Compliance → Action Record

| 逻辑字段 | 要求 |
|---|---|
| Action ID | 数据源提供；Action domain 内唯一；重复编号属于 data-quality issue，查询全量保留 |
| Store Reference | TRTID primary，English Store Name optional fallback；统一通过 Store Resolution |
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

Actions Analytics 使用独立的 context-only Repository query，不接收表格 view mode、sorting 或 pagination。`ActionAnalyticsResult` 返回 `closedOrCancelledCount`、`otherCount`、`closureRate`，逐项保留源 `sourceStatus` 及数量的 `byStatus`（仅包含实际收到的状态，不合并、不创造状态；服务端将 Cancelled、Closed 依次排在末尾，其余状态保持原有顺序），以及覆盖 `EhsFilterContext.period.includedMonths` 的逐月 `actionCount`。分母为当前 Global Filter scope 内全部 normalized Action 记录；`Closed` 与 `Cancelled` 计入分子，OPEN 与 UNKNOWN 计入其余数量。关闭率为 `(Closed + Cancelled) / 全部记录 * 100`，无记录时为 null。此 Analytics 口径不改变 `Cancelled → EXCLUDED` 状态映射，也不修改 Performance → KPI 的 source-provided Action Closure Rate。月度数量按 Submitted Date 的 Asia/Shanghai 月份归属，缺失月份补 0 并按月份升序；筛选、状态计数、关闭率与月度聚合由 Repository / Rule 完成。

## 8. Risk & Compliance → Certificates

### 8.1 Raw Source

仅七字段：TRTID、可选 English Store Name、Certificate Type、Expiry Date、Person、Person Email、Business Title。一行一张证件；当前没有 source record ID，重复记录全部保留，不擅自去重。Expiry Date 为 date-only 源字符串或 null，允许保留无效字符串用于异常原因。无中文门店名、源 Category、证号、发证日期、Source Reference、Valid From 或 Required Slot。

### 8.2 Normalized contract

每张记录提供 canonical storeId、中文 storeDisplayName、certificateCategory、certificateType、person、personEmail、businessTitle、expiryDate、daysUntilExpiry、certificateStatus、certificateReason。Raw 门店引用不暴露给 UI。

Category 为安全健康、急救员、特种作业、安全驾驶；未知 Type 的 Category 为 null，保留完整 normalized record，独立于四类别汇总输出，不参与其评价。Type exact mapping 见业务需求与集中规则；不使用别名或人员岗位推断。

单证状态仅 NORMAL / ABNORMAL；Reason 为 NORMAL、EXPIRED、MISSING_EXPIRY_DATE、INVALID_EXPIRY_DATE。日期无效或缺失时天数为 null，状态异常。天数使用 Dashboard referenceDate 的 Asia/Shanghai 业务日期做自然日差。

证件概览 `CertificateOverviewResult` 提供动态 `groups` 和 `items`；每项含分类、证件全名、`actualCount`、可空的 `requiredCount`，及服务端准备的 `progressValue`（0–100 或 null）。未设置要求和零分母不生成进度值；实际数量不因超过目标而截断。UI 按分类展示全部返回项，不固定小类数量，不计算比例。新增正式小类须在集中 Type → Category 映射中登记，不猜测未知源类型的归属。

每个 scoped Store 的结果包含四类别 summary（类别、状态、normalized records），即使无证件也保留门店及空类别。类别无记录或任一单证异常则 ABNORMAL，否则 NORMAL。

### 8.3 Overview result

Certificate 页面查询结果另含 Overview：`items` 为所有正式 Certificate Type 的已排序行，每行包含 `certificateCategory`、`categoryLabel`、`certificateType`、`shortLabel`、`fullLabel`、`requiredCount: number | null` 与 `actualCount`。Requirement 未配置时 `requiredCount` 为 null，表示“未设置”。`groups` 提供 `certificateCategory`、显示用 `label`、`startIndex`、`itemCount`，顺序与 rows 已在领域层准备好，供 X 轴显示大分类分组。Category 顺序、类型顺序及 shortLabel 来自集中 Certificate taxonomy metadata；所有正式类型都有行。requiredCount 根据 scoped `items` 门店数计算，actualCount 按这些门店下对应 normalized record 数计算，保持当前已实现口径。该结果由 Server Action 调用 Certificate domain rule 生成，不由 Repository 或 UI 聚合。

### 8.4 Query 与 Detail

复用现有 Store Resolution：TRTID primary、English Store Name fallback，保留 conflict / historical-name / duplicate / unresolved 语义。Region / Area / canonical Store 生效，Period ignored。查询使用现有 Data Availability 表达源解析完整性，不额外创造证件业务状态。

Detail Header：中文门店、类别、类别状态。按当前 records 的实际 Type 形成纵向 sections，每个 Type 下全部记录使用纵向 cards 展示 Person、Person Email、Business Title、Expiry Date、距离到期天数、单证状态；Type 只作为 section heading。新 normalized Type 自动追加，同 Type 多记录不去重或覆盖。未来新增字段必须显式扩展 typed contract 和 presentation。类别状态不检查 Required Slot 完整性，也不提供到期提醒。

## 9. Risk & Compliance → Environment

### 9.0 Environment Detail 契约

Raw Source 顶层保留：`TRTID`、可选 `English Store Name`、`环境影响评价`、`排污许可`、`排水许可`、`环境预案`、`监测`、`废弃物合同`。Raw 不保存中文门店名或业务结果；自由文本字段不限制为状态枚举。

- 环境影响评价：评价自由文本；总量要求含气-颗粒物、气-VOCs、水-氨氮、水-总氮、水-总磷、水-CODcr，均为 nullable 数值，单位吨/年。
- 排污许可：许可自由文本、执行报告、编号、有效期起止、产能、涂料批复用量、备注。产能与涂料批复用量保留 source-like typed value，不预设单位。
- 排水许可：洗车、许可自由文本、有效期起止、备注。
- 环境预案：备案情况、备案编号、有效期起止、备注；不含其它未定义字段。
- 监测：暂时保留当前“有 / 无 / 不适用”源值，其余字段 TBD。
- 废弃物合同：危险废物、一般工业固体废物两个数组，各为 0..N；每条记录含供应商名称、种类、有效期起止。数组保持全部源记录及顺序，不去重、不限数量。业务 requirement 是适用门店各至少有一份当前有效合同；这不改变 source multiplicity。

Normalized output：canonical `storeId`、Store Master 中文 `storeDisplayName`、`facilityInformation`、`environmentalLicenses`（环境影响评价 / 排污许可 / 排水许可）、`emergencyPlan`、`monitoring`、`wasteContracts`。设施信息当前为 TBD 空结构；不向 UI 暴露 Raw Store Reference。使用已有 `resolveStoreReference` 的 TRTID primary、English Store Name fallback、conflict 与 historical-name 规则，不假设源 TRTID 等于 canonical storeId。

Environment query 接收 typed Store scope，仅使用 Region / Area / canonical Store，不要求 Period。结果使用现有 Data Availability 表达数据完整性；缺失记录或无法解析的源记录不得补成“无”。

覆盖完整且合同数组为空代表已确认零份合同，是可用于持有率的业务缺口；Store 的 Environment snapshot 缺失或 source coverage 不完整时结果为 `INCOMPLETE` / `UNAVAILABLE`，不得用空数组伪装成无合同。合同当前有效是 derived rule：`validTo` 为合法 date-only 且 `validTo >= referenceDate`；同一门店同类有任一份有效合同即计入一次。source 不提供 holdingStatus、normal、abnormal 或 `hasContract`。

Environment Analytics 的 Client DTO 只接收 canonical Store scope，不接受 Global Period。Server Action 从注入的 `referenceDate` 派生当月自然月并传入 Repository。危险废物与一般工业固体废物合同持有率分别以当前 Global Filters 范围内全部门店为分母，以至少有一条对应类型合同记录的门店数为分子；每家门店每类最多计一次。只有 Environment 数据完整且分母大于 0 时返回比例，否则比例为 null。到期合同数量按两类合同记录的 `validTo` 统计当月记录；缺失或无效 `validTo` 不计入，并由 `excludedContractMissingOrInvalidExpiryDateCount` 保留审计信息。结果包含所用 `periodMonths`，供 stale result 展示匹配月份。

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

KPI Repository snapshot 必须包含集中 `KpiDomainResult[]`（`src/data/contracts/domain-result.ts`），各 Store 的 result、availability 与 reason 一起返回；Training / Inspection 输入中的月份来自规范化数据，Inspection 月份仅由合法 dueDate 派生。KPI Server Action 返回纯 presentation Builder 准备的 `KpiPageResult`：`rows: readonly KpiRow[]` 与查询级 `availability: DataAvailability`。无法定位门店的来源诊断保留在查询级，不改写有效门店行；零行结果仍保留诊断。任一源不完整或部分源不可用时查询级为 INCOMPLETE，全部源不可用时为 UNAVAILABLE；来源完整时按是否有门店行返回 AVAILABLE / CONFIRMED_EMPTY。每行只包含规范化门店身份、Training、Drill、Actions、Inspections 和 ASTM Events 的汇总结果及 Data Availability，不嵌入业务明细。Training、Drill、Inspection 与 ASTM 明细按需通过 typed Repository 查询，显式使用当前 Store 与 Global Period；ASTM 明细复用 normalized Event 数据并由 Repository 按 `ASTMInjuryIllness = "Yes"` 筛选。Action 下钻按需调用统一 Actions Repository `OPEN_ONLY` 查询，并按当前 Region / Area / Store 及 Submitted Date Period 过滤；`EXCLUDED`、`UNKNOWN` 和 `CLOSED` 不进入。Closure Rate aggregate 仍使用独立的精确 Period scope，不能从下钻明细重算。

## 11. Overview ScoreContribution

Overview 的 scoring 输入是领域规则完成评价后的 `ScoreContribution`，不是 raw record、UI 状态或 Prototype outcome。最小逻辑类型草案：

```ts
type ScoreContributionOutcome = "ACHIEVED" | "NOT_ACHIEVED";

type ScoreContributionReason =
  | "ACHIEVED"
  | "RULE_NOT_MET"
  | "SOURCE_MISSING"
  | "SOURCE_INVALID"
  | "SOURCE_INCOMPLETE"
  | "NOT_APPLICABLE"
  | "RULE_CONFIGURATION_MISSING";

interface ScoreContribution {
  metricId: OverviewMetricId;
  dimensionId: "PERFORMANCE" | "TAKE_CHARGE" | "CERTIFICATES" | "ENVIRONMENT";
  storeId: StoreId;
  month: Month;
  referenceDate: IsoDate;
  earnedPoints: 0 | 1;
  availablePoints: 1;
  outcome: ScoreContributionOutcome;
  reason: ScoreContributionReason;
}

type OverviewMetricId =
  | "TRAINING"
  | "DRILL"
  | "ACTION_CLOSURE_RATE"
  | "INSPECTION"
  | "ASTM_INCIDENT"
  | "TAKE_CHARGE_CLOSE_RATE"
  | "SUBMISSIONS_PER_CAPITA_YTD"
  | "PARTICIPATION_RATE_YTD"
  | "CERTIFICATE_SAFETY_HEALTH"
  | "CERTIFICATE_FIRST_AID"
  | "CERTIFICATE_SPECIAL_WORK"
  | "CERTIFICATE_SAFE_DRIVING";
```

Runtime types live in `src/data/contracts/overview.ts`. The repository returns scoped canonical Stores, supported months, and domain-produced contributions. The server query authorizes scope, reads this result, and passes it to Overview preparation; the browser receives only the prepared `OverviewResult`.

正式 Overview query DTO 只携带 canonical `EhsStoreScope`，不接受 Global Period。Preparation 使用注入 `referenceMonth`，当前结果为该月，与上一个自然月比较。历史序列只包含 Repository 已支持且可用的月份，不生成缺失月份占位。Matrix 的 score / delta 数据和自适应 xDomain / yDomain 均由 preparation 提供；图表不得偏移或重算坐标。

V1 invariant: all 12 catalog metrics apply to every Store and produce one row per Store × Month; each has `availablePoints = 1`, and `earnedPoints` is exactly `1` for `ACHIEVED` or `0` for `NOT_ACHIEVED`. Every Store therefore has 12 available points per month. N/A, missing, invalid and incomplete source results remain rows with their diagnostic reason; no Store or metric is removed from the denominator. `referenceDate` is the month-end business date for completed months and the injected Dashboard reference day for the current month. Domain Result owns the diagnostic reason; the producer copies it without inferring from DataSet-level availability or UI state.

Metric catalog and achievement mapping are owned by `metric-rules.md`; this contract does not define a generic rule engine. A future metric adds its own domain result and contribution producer, then registers its `metricId` / `dimensionId`. A future approved weight changes the contribution point values consistently for every Store and month; pooled aggregation remains unchanged. Environment can later add a domain result and contribution under `ENVIRONMENT` without changing aggregation. Environment is excluded from the V1 metric catalog.

Historical data from 2026-01 through the current business month produces one contribution for each Store × Metric × Month, including source-missing months. Prior supported months use month-end `referenceDate`; the current month uses the injected current business date. Recompute from reliable historical domain records using that reference date where possible; otherwise use a future production snapshot. Snapshot schema and implementation remain out of scope.


## 12. Hardening V1 normalized boundaries

- `DomainSource<T>` 表达单个 Store × Period 的 normalized records、availability 与可选 source reason；不能用全 Dataset 的坏数据覆盖其它 Store 的贡献。
- `KpiDataSnapshot.diagnostics` 是服务端可选的 Store-scoped 培训／检查说明，按记录月份列出项目与字段空值、格式错误或来源覆盖问题；不再将未安排记录的月份或项目视为缺记录；它由现有校验分支附带输出，不参与结果或得分计算。KPI Builder 透传到行 DTO，前端只交给共享 DataAvailabilityDisplay 悬停展示。
- `KpiDataSnapshot.domainResults` 是 KPI / ScoreContribution 的共同真源；KPI Builder 不评价业务。`KpiInspectionRecord.month` 是 Adapter 派生值，Raw Inspection 仍不提供 month。
- `TakeChargeAnnualSource` 仅含 `submissionsPerCapitaYtd`、`participationRateYtd` 两个 source-provided normalized values 及独立原因，不规定 Production numerator/denominator schema。Goals 使用 reference year/month；Global Period 不参与 YTD 查询。Mock fixture adapter 保留 pooled source numerator/denominator 口径，不平均 Store 百分比。
- `TakeChargeMetricValue` 与 `CertificateCategorySummary` 保留领域 reason；12 个 scoring producer 消费真实领域诊断。非法 NaN 不得降为通用 SOURCE_INCOMPLETE。
- 缺失/非法日期无法确定 Period membership 时不补日期；仅保守标记可定位 Store/domain。不能解析到 Store 的行保持 orphan diagnostic，不任意分配。Production authoritative scope/coverage 的物理表示仍为 TBD。

## 13. Production Import API V1

`docs/api/production-api-v1.yaml` is the versioned HTTP contract. The API accepts raw source records from the existing Domain contracts plus import metadata; it rejects dashboard-derived score, rank, ScoreContribution and presentation aggregates. The OpenAPI documents `POST /api/v1/import/batches`, `GET /api/v1/import/batches/{batchId}`, `POST .../{batchId}/validate` and `POST .../{batchId}/publish`.

An import batch carries `schemaVersion`, `sourceSystem`, optional `sourceVersion` / `configurationVersion`, `domain`, `batchId`, `extractionTime`, optional `businessPeriod` / `effectiveTime`, coverage declaration and optional source proof, `expectedRecordCount`, `idempotencyKey` and domain-specific records. Date-times require an explicit UTC offset; periods are half-open. Training, Drill, Inspection, Action Closure Rate, Events, Actions and Take Charge require business-period coverage. Store Master, Certificates, Environment and required-set configuration require an effective-time range. `sourceSystem` is business provenance, never caller identity.

Record business times must fall within `coverage.businessPeriod`: Training/Drill whole Shanghai months and Action Closure Rate aggregate ranges must be contained; Inspection uses Shanghai date-only `dueDate`, Events `eventDate`, Actions `submittedDate`, and Take Charge `submittedAt`. Inspection `dueDate: null` remains permitted for existing Domain diagnostics. When batch `businessPeriod` is supplied, its endpoint instants must equal coverage endpoints regardless of JSON key order or equivalent offsets. Required date-times cannot be null except Action `closedDate`; each required-set row contains exactly one nonempty set array, with the other property absent. The generic transport rejects Take Charge annual aggregates even for zero-record authoritative-empty batches.

Lifecycle: `RECEIVED → VALIDATED | REJECTED → PUBLISHED`. Identical retries use `(sourceSystem, domain, idempotencyKey)` and return the prior batch; reusing that key for a different body is a conflict. Source `COMPLETE` means `DECLARED_COMPLETE`; only an independently checked proof permits `VERIFIED_COMPLETE` and formal publication. `PARTIAL` is `INCOMPLETE`; unknown source completeness remains `UNKNOWN`; both are unpublishable. Expected count versus request count checks self-consistency only. Proof kinds are control total, export manifest, scope digest, or authoritative empty declaration; no proof is fabricated by this service. A production adapter must atomically CAS the batch revision/state, persist audit, publish records and switch the active pointer in one transaction. Validation must never update `PUBLISHED`; stale validation/publish revisions conflict; same-batch repeat publish returns its published result. Failure must leave the prior active data and pointer queryable. Test memory stores are contract test doubles only.

The trusted `MachinePrincipal` contains stable `principalId`, authorized Domain IDs and authorized operations (`SUBMIT`, `READ`, `VALIDATE`, `PUBLISH`). Each batch records trusted `createdByPrincipalId`, monotonically increasing `revision`, coverage assessment, and append-only submit/validate/publish audit events with actor principal, timestamp, outcome, request ID, and diagnostics. Principal IDs come only from the server Machine Identity Provider; request payload identity fields are rejected. Never persist credentials or tokens. Source version, configuration version, business/effective periods, extraction and publication times support traceability. Snapshot `referenceDate` and historical replay semantics remain TBD.

Store Master `trtid` is rejected when empty or whitespace-only; this does not define Store lifecycle policy. The current Training duplicate guard uses provisional Store × Month × `trainingName` solely to flag within-batch duplicates; it is not a confirmed enterprise natural key. Required-set duplicate identity includes set kind, so Training and Inspection configurations for the same Store × Month do not collide. Company source identity and required-set authority remain integration decisions.

Diagnostics identify Domain, batch, row index or source record ID where available, field, stable error code, message and severity. Schema errors reject a batch; unresolved Store references and coverage mismatch block publication. Invalid Certificate expiry text is retained with a warning so the existing Certificate Rule can produce its current invalid-date reason. Take Charge annual values are supplied by the company Production Repository Adapter; the generic import API rejects that Domain with `DIRECT_REPOSITORY_INTEGRATION_REQUIRED` instead of inventing a company batch schema.

Current implementation status is explicitly not equivalent to production service readiness: route handlers and generic contract validation exist, while the machine verifier and durable storage are unconfigured. The OpenAPI marks those endpoints `INTEGRATION_REQUIRED`; runtime responds 503 until adapters are installed.


## 当前用户资料（2026-10-16）

访问用户的头像、姓名和邮箱来自访问时带入的资料：独立登录由可信 `ServerIdentityProvider` 提供；嵌入入口由已校验 origin / source 的 `GLIFE_CONTEXT` 提供 `name`、可选 `avatarUrl` 与 `email`，且显示资料须对应当前服务端账号邮箱。Sidebar 不再用权限管理的姓名覆盖访问资料。邮箱仍由服务端验证后用于权限匹配，浏览器显示资料不构成认证凭据，也不改变 Effective Access。

权限管理保留可选姓名 `name`，可不填写；邮箱必填且必须有效。权限表中组织联系人姓名继续按邮箱取门店主数据，其他用户可手动维护姓名；该字段与访问时的用户显示名独立。同一邮箱多条手动授权的姓名 mutation 仍须同步并保留审计。缺失显示名不从邮箱推断。Mock 使用 `EHS_MOCK_USER_NAME` / `EHS_MOCK_USER_AVATAR_URL` 模拟入口资料。

系统监控模块已移除，含页面、错误上报 API、事件捕获、通知、任务监控与相关持久化端口。安全错误码、错误重试界面、领域 DataAvailability、Access / Import 审计仍保留。Environment 的环境监测数据不受影响。

Take Charge Period 查询：服务端直接统计完整筛选周期内已有记录，不按 Mock 年份／月份覆盖范围判断完整性。零记录时提交总数为 0、关闭率为 null（显示“-”）；已有记录的必要字段缺失、格式错误、非法日期或门店无法关联仍保留诊断。授权、周期合法性校验和年度指标保持原规则。
