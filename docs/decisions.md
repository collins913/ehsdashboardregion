# EHS Dashboard 已确认决策

- 版本：V1（整理版）
- 日期：2026-09-11
- 状态：仅记录已冻结决策；未确认事项不视为默认规则

## 1. 文档分工

### D-001 四份业务文档各司其职

- `business-requirements.md`：页面做什么。
- `metric-rules.md`：如何计算与判定。
- `data-contract.md`：计算与展示需要什么逻辑数据。
- `decisions.md`：记录已确认的跨模块决策。

这些 Markdown 是设计与开发依据，不是代码直接导入的配置。

## 2. 信息架构

### D-002 V1 主导航

```text
Overview
Performance → KPI / Goals
Risk & Compliance → Events / Actions / Certificates / Environment
Stores
```

单项 KPI 与 Goal 属于页面内容，不作为侧边栏目的地。

### D-003 Global Filters 属于全局框架

全局筛选预留 Region、Area、Store、Period。它们不属于 Overview 私有页面。

Store Master Data 不使用 Period；其它筛选关系仍按各模块需求执行。

Query readiness / identity 只依赖该业务查询真正使用的 filter dimensions。Stores、Environment、Certificates 从同一 Global Filter State 消费有效 Store scope，不依赖 Period 有效性，不补造默认 Period；period-aware 查询继续要求完整有效 Period。保持一份 Provider 和现有 Repository / async 边界。

Region、Area 初始为 `ALL` 并支持单选；Store 初始为 `ALL` 并支持 canonical `storeId` 多选。Region / Area 变化时清除失效的下级选择。

Period V1 使用 `Asia/Shanghai` 下的完整自然月，默认本季度，支持本年、本季度、本月及自定义月份范围。本季度为季度首月至当前月，本年为当年 1 月至当前月，不纳入未来月份；不提供日级日期或部分月份输入。

### D-004 先定义底层业务，再定义 Overview

Overview 只汇总前述模块的统一结果，不产生另一套业务事实或重复计算。健康度、评分和汇总规则待底层业务稳定后另行定义。

## 3. 业务与技术边界

### D-005 Performance 与 Risk & Compliance 分层

- Performance 展示计算后的 KPI 与 Goal 结果。
- Risk & Compliance 展示底层业务记录及合规结果。
- 明细页与 KPI 不各自维护同一事实的两套算法。

### D-006 业务规则不得散落在页面组件

Training、Drill、Inspections、ASTM、Actions Open 分类与 Certificates 判定由集中业务逻辑维护。Environment 当前状态 V1 仅展示中性源值，不产生合规判定。页面组件只消费结果。

### D-007 数据源直接值不得由 Dashboard 重算

以下值由后续数据源直接提供：

- Action Closure Rate
- Take Charge current-year Average Submissions
- Take Charge current-year Participation Rate

Dashboard 不根据明细猜测分子、分母或人员基数。

### D-008 未确认的业务含义必须保留为 TBD

不得自行补全公式、阈值、状态、筛选关系、数据库字段、权限、日期边界或异常处理。

## 4. 门店主数据与关联

### D-009 Store Detail 只核对主数据

Store Detail 不承载 Performance 或 Risk & Compliance 内容，也不进行 KPI、风险或合规计算。

### D-010 Stores 列表与详情字段边界

Stores 列表默认显示 Store Name CN、Region、Area、TRTID、Manager、EHS&S 代表；Store Name EN 仅在 Store Detail 展示。底层 `ehsAmbassador` 字段名保持稳定。未来允许扩展字段，但新增字段是否进入列表或详情必须另行确认。

### D-011 TRTID 不是所有数据源的强制唯一关联键

不同数据源可能通过 TRTID、Store Name CN 或 Store Name EN 关联门店。必须由数据层统一执行 Store Mapping / Resolution；页面不得自行匹配。Events、Actions、Environment V1 与 Certificates V1 共用 TRTID 精确唯一匹配优先、失败时 Store English Name 精确唯一 fallback 的策略。TRTID 唯一有效而英文名无匹配时接受 TRTID，以兼容历史改名；英文名明确匹配另一门店时判定冲突。Take Charge 当前仅提供 TRTID，复用同一 resolver。其它生产数据源策略仍为 TBD。

### D-012 Stores 列表交互位置

搜索、排序和列显示控制优先整合在表格标题行或表头区域。

## 5. Performance

### D-013 KPI 业务对象固定为五项

V1 KPI 为 Training、Drill、Actions、Inspections、Events。

### D-014 Training、Drill、Inspections 为达成型 KPI

- Training：只评价 Period 内实际存在的必修培训；全部完成或完整数据源内无培训记录时达成，任一未完成时未达成。
- Drill：纳入 Period 的每个月必须有 Drill 记录，且当月所有记录均完成；缺月或存在未完成时未达成。
- Inspections：纳入 Period 的每个月必须有需要评价的 Inspection，且当月全部完成；缺月或存在未完成时未达成。

不为这三项强行生成未经确认的百分比。

### D-015 Events KPI 展示是否发生 ASTM Incident

Events KPI 展示“发生 / 未发生”，不展示事故数量。

ASTM 不维护独立数据源；以 Events 的 `ASTMInjuryIllness` 作为判断输入。值为 `Yes` 时表示 ASTM Incident，其它值均不表示 ASTM Incident。

### D-016 Goals V1 指标范围、目标和精度

| Goal | 目标 | 展示精度 |
|---|---:|---:|
| 提交总数 | 无目标 | 整数 |
| Take Charge Close Rate | >= 90% | 0 位小数 |
| 今年平均提交数 | >= 4 | 1 位小数 |
| 今年参与率 | >= 50% | 0 位小数 |

提交总数与关闭率跟随 Global Period；关闭率由 Take Charge 明细的月度分子/分母汇总计算。两个“今年”指标固定为 reference year 年初至当前月，只跟随 Region / Area / Store，并使用数据源范围 aggregate；不得平均门店最终值。

## 6. Events 与 Actions

### D-017 Events 使用一套记录和可扩展 Event Type

当前已知 source value 为：

- `Agency`：政府检查
- `Non-Agency Event`：非政府检查事件

Event Type 保留 source-provided string，筛选选项由 normalized records 动态生成，不把 UI 限定为上述两项。ASTM 不在 Events 页面单独建立模块。

### D-018 Events 与 Actions 默认显示 Open

两个页面均提供 Open / All 切换，并默认 Open。

- Actions 已确认 `Assigned`、`In Progress`、`In Review`、`Sign Off` 为 `OPEN`，`Closed` 为 `CLOSED`，`Cancelled` 为 `EXCLUDED`；未知未来状态为 `UNKNOWN`。Raw Status 保留，UI 不重新分类。
- Events 的 `Open` 归类为 `OPEN`，`Closed` 归类为 `CLOSED`；未确认值为 `UNKNOWN`，不得猜测为 Open。

### D-019 Action Closure Rate 与 Action 明细分离

Actions 页面展示明细；KPI 页面读取数据源提供的 Action Closure Rate，不从明细重算。

## 7. Certificates

### D-020 Certificates V1 四类别与集中 exact mapping（替代旧五类别 / Required Slot 决策）

V1 类别为安全健康、急救员、特种作业、安全驾驶。Category 由集中 Certificate Type exact mapping 得到，不来自 Raw，不使用 Person、Business Title、别名或模糊匹配。未知 Type 保留独立 normalized record，不影响四类别评价。Required Slot 不参与 V1，不提前建立完整性 framework；未来扩展需另行确认。

### D-021 Certificates V1 单证与类别只使用正常 / 异常（替代旧“无” / 缺日期未确定决策）

有效 date-only 到期日不早于 Dashboard referenceDate 时单证 NORMAL；过期、缺日期、无效日期均 ABNORMAL，并区分原因。Store × Category 零记录或任一单证异常则 ABNORMAL，至少一张且全部有效则 NORMAL。不检查具体 Type 是否齐全；主表不显示“无 / 未确定”。Region / Area / Store 生效，Period ignored；referenceDate 用于有效期和自然日差。

### D-022 不提供证件到期提醒

V1 不设置“即将到期”状态，不定义提前提醒天数，也不实现到期提醒功能。

## 8. Environment

Environment 当前状态 V1 的六字段为环境影响评价、排污许可、排水许可、环境预案、监测、废弃物合同，仅允许“有 / 无 / 不适用”。Region / Area / Store 生效，Period ignored；无正常 / 异常计算，不将“无”视为异常。

以下 D-023–D-027 保留历史环境合规需求，**不属于 Environment 当前状态 V1**；后续真实输入与适用关系需另行确认，不可作为 Overview 当前环境健康度的依据。

### D-023 危废与一般固废合同共同满足才正常

两类合同均存在且所有相关合同有效时正常；缺少任一类或任一相关合同过期时异常。

### D-024 洗车业务决定排水许可是否必需

- 无洗车业务：正常。
- 有洗车业务但无排水许可：异常。
- 有许可但已过期：异常。
- 有洗车业务且许可有效：正常。

### D-025 EIA 不按有效期判断

- EIA Required 为 No：正常。
- Required 为 Yes 但无信息：异常。
- Required 为 Yes 且有信息：正常。

### D-026 排污许可按适用性和有效期判断

- Discharge Permit Required 为 No：正常。
- Required 为 Yes 但无许可：异常。
- 有许可但已过期：异常。
- Required 为 Yes 且许可有效：正常。

### D-027 环境监测目前只定义存在性展示

- 无记录：显示“无”。
- 有记录：显示“查看”，可进入明细。

“无”仅表示没有记录，不进行正常或异常判断。监测结果和监测频次规则尚未确认。

### D-028 有效期统一边界

- `Expiry Date < Reference Date`：过期。
- `Expiry Date >= Reference Date`：有效，到期日当天仍有效。
- 历史环境合规需求中，缺失必要 Expiry Date 且没有更早异常结论：`UNDETERMINED`；不适用于 Environment 当前状态 V1。
- Certificates V1 缺失 / 无效日期为 `ABNORMAL`，具体以 D-021 为准，不沿用历史缺日期规则。
- 共享 Dashboard referenceDate 与 Global Period 独立；规则接受注入值，不另读系统或浏览器当前时间。
- 生产环境如何确定 Reference Date：TBD。

### D-029 KPI 使用集中数据组装契约

KPI 页面只消费 `KpiRow[]`。Repository 根据 `EhsFilterContext` 返回规范化 scoped snapshot，KPI Builder 分组输入并调用现有 Rule Engine。页面不读取 mock、不关联门店、不推断月份、不计算 KPI。

### D-030 数据可用性必须显式表达

KPI 数据使用 `AVAILABLE`、`CONFIRMED_EMPTY`、`INCOMPLETE`、`UNAVAILABLE`。Data Availability 只表达数据源覆盖/同步是否完整，不把“没有业务记录”解释为数据不完整。零条过滤结果不能自行证明数据完整；已有完整 coverage 的空集可返回 `CONFIRMED_EMPTY`，ASTM 只有在该完整空集时才返回 `NOT_OCCURRED`。

### D-031 KPI 使用规范化 Store ID

页面和 KPI Builder 只消费 `storeId`。TRTID、Store Name CN、Store Name EN 到 `storeId` 的解析属于 Adapter / Repository，UI 不假设 storeId 等于 TRTID；已确认源策略见 D-011，尚未确认的其它生产源策略保持 TBD。

### D-032 Action KPI 汇总与明细边界

Action Closure Rate 只读取与请求 `[startInclusive, endExclusive)` 完全匹配的源汇总值，不计算或平均。`>= 90%` 为 `ACHIEVED`，`< 90%` 为 `NOT_ACHIEVED`。完整 Coverage 下确认没有需要整改的 Action 时，`value = null`、结果为 `ACHIEVED`；无法确认 Period aggregate 时为 `INCOMPLETE` / `UNDETERMINED`。KPI 初始汇总不携带 Action 明细，明细按需查询且无需与 Closure Rate aggregate 对账；下钻范围由 D-038 统一规定。

### D-033 KPI 查询契约采用显式时区与实际门店覆盖

KPI Period 的起止时间必须包含 `Z` 或 UTC offset。Repository 集中校验时间范围和 `includedMonths` 一致性；无效输入安全降级，不产生正常 KPI 结论。`Store = ALL` 时覆盖校验使用筛选范围内实际规范化 `storeId`。

### D-034 Global Filter 状态由 Dashboard Layout 持有

Global Filter Provider 挂载于 Dashboard route layout。业务子页面切换时共享并保留同一份 Filter State；页面不得各自维护或重新解释筛选参数。刷新后重置为当前安全默认状态，V1 不使用 localStorage、sessionStorage 或 URL 持久化筛选状态。

DashboardShell 同时持有持续挂载的 PageHeader / GlobalFilters；业务路由只组合页面内容，不重复创建 Header。标题、说明与面包屑复用 `src/config/navigation.ts`，UI Lab 可显式退出正式 Header composition。

### D-035 全局主题与界面语言

应用使用 `next-themes` 提供 Light、Dark、System 三种全局主题，组件只消费 shadcn semantic tokens，不复制 Dark Mode 组件或硬编码页面颜色。用户可见界面统一使用中文；内部业务枚举、类型、变量、文件名和路由保持英文。当前不引入 i18n 框架。

### D-036 Data Table 采用小型共享能力组合

业务表格使用 shadcn Table 与 TanStack Table。排序表头、列显隐、分页辅助和可点击单元格等真实复用能力可拆为小型 shared component / hook；各业务表格继续维护自己的 columns、filters、drill-down 和业务行为。在多个业务页面出现一致需求前，不建立大型 `GenericDataTable`。

异步查询分离 requested state 与最后成功的 resolved presentation，继续采用 latest-request-wins。相同语义范围内的分页/排序 pending 可保留不可交互的 resolved presentation；语义筛选变化必须遮蔽旧业务内容，只对未知 metadata 数字呈现 pending，保留表格几何、固定文字与分页结构。新结果与 corrected page index 一次替换，不改变 Repository-side 排序/分页契约。

### D-037 Actions 页面使用 Submitted Date 应用 Global Period（由 D-038 扩展）

Risk & Compliance → Actions 的 Open 与 All 视图均按 Submitted Date 应用 Global Period；Open 额外限定集中解析后的 `RecordState = OPEN`。该页面语义不改变 Performance → KPI 的 Closure Rate aggregate。KPI 下钻范围由 D-038 统一规定。

### D-038 Action 明细统一使用 Submitted Date Period

所有 Action 明细视图按 Global Region / Area / Store 及 Submitted Date Period 查询。Performance → KPI Actions 下钻与 Risk & Compliance → Actions Open 视图复用同一规范化 `OPEN_ONLY` Repository 查询，相同 Filter Context 下必须返回相同 OPEN Action ID；Actions All 视图在同一范围内保留全部 RecordState。本决策取代 D-032、D-037 中 KPI 下钻忽略 Period 的旧表述。Action Closure Rate 继续使用数据源提供的独立 aggregate，禁止从明细重算或要求二者对账。

### D-039 Events V1 使用统一 normalized Repository

Risk & Compliance → Events 按 Global Region / Area / Store 及底层 `Event Date` / `eventDate` 字段查询，用户可见术语统一为 `Event Time` / “事件时间”。Current Open 与 All 复用同一 `getEvents` Repository；Event Type 是动态 source value 筛选。Events 与 Actions 共用既有 Store Resolution，UI 只消费 canonical Store。KPI ASTM 输入复用 normalized Event 数据，未来 drilldown 不建立第二套 Event 数据链。V1 Detail 仅展示公共字段，type-specific schema 保持 TBD。

### D-040 Client 数据访问统一经过 Server Action

正式 Client Feature 不创建或导入 Repository implementation。Client 仅提交可序列化 query DTO；Server Action 使用 server-only factory 创建当前 Repository，并返回 normalized async result。Mock Repository 是当前 development implementation，不在 public barrel 中伪装为 Production。Actions、Events、Take Charge 在 Repository 中先完成完整 scoped result 的排序再分页；KPI、Stores、Environment 与 Certificates 当前保留 Client pagination。

### D-041 Mock Profile 只切换 server-only Dataset

`EHS_MOCK_PROFILE` 未设置、空值或 `standard` 时固定选择 Standard；`performance` 选择 deterministic Performance Dataset，其他非空值立即失败。两种 Profile 只在 Mock Source / Dataset 层不同，共用同一个 Mock Repository、Adapter、Store Resolution、availability、筛选、排序、分页及业务规则。Feature、UI、Server Action DTO 与 Repository public contract 不感知 Profile。Production 是未来独立 Repository implementation，不是第三个 Mock Profile。

## 9. 明确未决事项

以下内容没有默认答案：

- 非完整自然月和自定义日期区间的 KPI 规则
- Training 与 Inspection 的 Requirement 集合来源
- 生产环境 Reference Date 的来源
- 危废/一般固废组合结果在两个独立类别列中的呈现方式
- Environmental Monitoring 的明细字段、频次与监测结果规则
- 尚未确认的其它生产数据源 Store Resolution 策略；当前 Environment / Certificates 复用 D-011，Take Charge 使用 TRTID
- 数据库、API、权限、刷新、持久化及视觉状态规范

## 10. 项目技术决策（既有）

- shadcn/ui 作为基础 UI 系统。
- 复用顺序：本地组件 → shadcn/ui → shared component → 提议新增组件。
- 采用 Desktop First。
- 应用采用 Next.js App Router、React、TypeScript 和 Tailwind CSS。
- 页面路由共享 `DashboardShell`；导航集中在 `src/config/navigation.ts`。
- UI 仅通过 repository 抽象访问数据。
- 设计令牌只表达通用界面语义，不表达 EHS 业务状态。
- 真实数据库仍为 TBD。
