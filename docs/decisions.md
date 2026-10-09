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
Access Management（仅全局管理员）
```

单项 KPI 与 Goal 属于页面内容，不作为侧边栏目的地。

### D-003 Global Filters 属于全局框架

Global Filters 共享 Region、Area、Store 与 Period 状态，但 Period 控件按 route metadata 显示。Overview、Certificates、Environment、Stores 不显示或消费 Period；其它明确依赖日期范围的页面继续显示。Environment 到期合同数量使用 referenceDate 所在自然月，由 Server Action 在数据层准备。Query readiness / identity 只依赖业务查询真正使用的维度，不建立第二套 Provider 或默认 Period workaround。

Region、Area 初始为 `ALL` 并支持单选；Store 初始为 `ALL` 并支持 canonical `storeId` 多选。Region / Area 变化时清除失效的下级选择。

Period V1 使用 `Asia/Shanghai` 下的完整自然月，默认本季度，支持本年、本季度、本月及自定义月份范围。本季度为季度首月至当前月，本年为当年 1 月至当前月，不纳入未来月份；不提供日级日期或部分月份输入。

### D-004 先定义底层业务，再定义 Overview

Overview 只汇总前述模块的统一结果，不产生另一套业务事实或重复计算。Overview V1 scoring 与 aggregation contract 依 D-044 执行；各领域业务结果仍由对应 Domain Rule 负责。

## 3. 业务与技术边界

### D-005 Performance 与 Risk & Compliance 分层

- Performance 展示计算后的 KPI 与 Goal 结果。
- Risk & Compliance 展示底层业务记录及合规结果。
- 明细页与 KPI 不各自维护同一事实的两套算法。

### D-006 业务规则不得散落在页面组件

Training、Drill、Inspections、ASTM、Actions Open 分类与 Certificates 判定由集中业务逻辑维护。Environment detail 仅展示 normalized typed data，不产生合规判定或根据文本、缺失值、日期推断状态。Environment Analytics 在后端按全局筛选门店范围计算两类合同持有率与到期合同数量；页面组件只消费结果。

### D-007 数据源直接值不得由 Dashboard 重算

以下值由后续数据源直接提供：

- Action Closure Rate
- Take Charge current-year Average Submissions
- Take Charge current-year Participation Rate

Dashboard 不根据明细猜测分子、分母或人员基数。

### D-008 未确认的业务含义必须保留为 TBD

不得自行补全公式、阈值、状态、筛选关系、数据库字段、未定义的权限、日期边界或异常处理。Access Management V1 的已确认规则见 D-042。

## 4. 门店主数据与关联

### D-009 Store Detail 只核对主数据

Store Detail 不承载 Performance 或 Risk & Compliance 内容，也不进行 KPI、风险或合规计算。

### D-010 Stores 列表与详情字段边界

Stores 列表默认显示 Store Name CN、Region、Area、TRTID、Manager、EHS&S 代表；Store Detail 另展示 Store Name EN 及四类管理联系人的姓名和邮箱。底层 `ehsAmbassador` 字段名保持稳定。未来允许扩展字段，但新增字段是否进入列表或详情必须另行确认。

### D-011 统一 Store Resolution

所有业务源使用 TRTID 作为正式门店主标识，English Store Name 为可选 fallback。所有领域复用同一 resolver：TRTID primary；缺失或不能唯一解析时 English Store Name 精确唯一 fallback；明确冲突、重复命中或未解析时不得静默匹配。TRTID 唯一有效而英文名无匹配时接受 TRTID，以兼容历史改名。业务源不提供 canonical `storeId`，解析结果由 Repository / normalization 生成。Store Master 是 current snapshot；历史报表按当前组织归属解析，不引入 temporal Store Master。

### D-012 Stores 列表交互位置

搜索、排序和列显示控制优先整合在表格标题行或表头区域。

## 5. Performance

### D-013 KPI 业务对象固定为五项

V1 KPI 为 Training、Drill、Actions、Inspections、Events。

### D-014 Training、Drill、Inspections 为达成型 KPI

- Training Overview 月度 metric：当月 required Training set 中每项都有有效 source record 且 source `completionRate = 100` 才达成；任一项未完成、缺失、无效、格式错误或 required coverage 不完整均为未达成。Mock V1 set 由集中 provider 提供，Production 后续以 authoritative source/config 替换；不得从实际 Training records 推断。KPI 与 Overview 共用同一 required-set Domain Result，后者仅映射 points；缺失/非法/不完整保留 UNDETERMINED 与具体原因。
- Drill：纳入 Period 的每个月必须有 Drill 记录，且当月所有记录均完成；缺月或存在未完成时未达成。
- Inspection Overview 月度 metric：当月 formal required Inspection task set 全部存在且已完成才达成；任一未完成、缺记录、状态缺失/无效、source 格式错误或 required coverage 不完整均为未达成。Mock V1 set 由集中 provider 提供，Production 后续替换 authoritative source/config，不得从实际 Inspection records 推断。KPI 与 Overview 共用同一 required-set Domain Result，后者仅映射 points。

不为这三项强行生成未经确认的百分比。

### D-015 Events KPI 展示是否发生 ASTM Incident

Events KPI 展示“发生 / 未发生”，不展示事故数量。

ASTM 不维护独立数据源；以 Events 的 `ASTMInjuryIllness` 作为判断输入。正式值为 `Yes` / `No`；未知值不映射为 `No`，相关数据集标记为 `INCOMPLETE`。

### D-016 Goals V1 指标范围、目标和精度

| Goal | 目标 | 展示精度 |
|---|---:|---:|
| 提交总数 | 无目标 | 整数 |
| Take Charge Close Rate | >= 90% | 0 位小数 |
| 今年平均提交数 | >= 4 | 1 位小数 |
| 今年参与率 | >= 50% | 0 位小数 |

提交总数与关闭率跟随 Global Period；关闭率由 Take Charge 明细的月度分子/分母汇总计算。两个“今年”指标固定为 reference year 年初至当前月，只跟随 Region / Area / Store，并由 upstream 提供数据源范围 aggregate；Dashboard 不从明细重算，也不得平均门店最终值。只有完整明细与正式 denominator 定义后，才可评估迁移为 Dashboard-derived metric。

## 6. Events 与 Actions

### D-017 Events 使用一套记录和可扩展 Event Type

当前已知 source value 为：

- `Agency`：政府检查
- `Non-Agency Event`：非政府检查事件

Event Type 保留 source-provided string，筛选选项由 normalized records 动态生成，不把 UI 限定为上述两项。ASTM 不在 Events 页面单独建立模块。

### D-018 Events 与 Actions 默认显示 All

两个页面均提供 All / Open 切换，并默认 All。

- Actions 已确认 `Assigned`、`In Progress`、`In Review`、`Sign Off` 为 `OPEN`，`Closed` 为 `CLOSED`，`Cancelled` 为 `EXCLUDED`；未知未来状态为 `UNKNOWN`。Raw Status 保留，UI 不重新分类。
- Events 的 `Open` 归类为 `OPEN`，`Closed` 归类为 `CLOSED`；未确认值为 `UNKNOWN`，不得猜测为 Open。

### D-019 Action Closure Rate 与 Action 明细分离

Actions 页面展示明细；KPI 页面读取数据源提供的 Action Closure Rate，不从明细重算。

## 7. Certificates

### D-020 Certificates V1 四类别与集中 exact mapping（替代旧五类别 / Required Slot 决策）

V1 类别为安全健康、急救员、特种作业、安全驾驶。Category 由集中 Certificate Type exact mapping 得到，不来自 Raw，不使用 Person、Business Title、别名或模糊匹配。未知 Type 保留独立 normalized record，不影响四类别评价。Store × Category 状态不执行 Required Slot 完整性检查。Certificate Overview 展示全部八种正式 Type；其中六种按明确配置展示应持有数，两种 `requiredCount = null` 表示未设置。不建立通用 Required Slot framework，也不改变类别状态。

### D-021 Certificates V1 单证与类别只使用正常 / 异常（替代旧“无” / 缺日期未确定决策）

有效 date-only 到期日不早于 Dashboard referenceDate 时单证 NORMAL；过期、缺日期、无效日期均 ABNORMAL，并区分原因。Store × Category 零记录或任一单证异常则 ABNORMAL，至少一张且全部有效则 NORMAL。不检查具体 Type 是否齐全；主表不显示“无 / 未确定”。Region / Area / Store 生效，Period ignored；referenceDate 用于有效期和自然日差。

### D-022 不提供证件到期提醒

V1 不设置“即将到期”状态，不定义提前提醒天数，也不实现到期提醒功能。

## 8. Environment

Environment 主表保持门店维度，仅提供设施信息、环保证照、应急预案、监测、废弃物合同五个详情入口。详情使用显式 typed contract；自由文本和日期仅展示，废弃物合同保留全部记录。Region / Area / Store 生效，Period 与 referenceDate ignored；无正常 / 异常计算，不根据缺失、文本或日期推断结果。Monitoring 暂时保留“有 / 无 / 不适用”源值。

当前业务要求适用门店至少有一份当前有效危险废物合同和一份当前有效一般工业固体废物合同。Source multiplicity 仍为每类 0..N；完整 coverage 下 0 条是已确认业务缺口，缺失 / 不完整 coverage 不能解释为无合同。当前 Environment V1 只计算持有率与到期数量，不输出合规状态。以下 D-023–D-027 保留历史环境合规判定规则，**不属于当前 Environment Detail / Analytics V1**，不可据此产生 NORMAL / ABNORMAL 或 Overview 环境健康度。

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
- 历史环境合规需求中，缺失必要 Expiry Date 且没有更早异常结论：`UNDETERMINED`；不适用于当前 Environment Detail Expansion。
- Certificates V1 缺失 / 无效日期为 `ABNORMAL`，具体以 D-021 为准，不沿用历史缺日期规则。
- 共享 Dashboard referenceDate 与 Global Period 独立；规则接受注入值，不另读系统或浏览器当前时间。
- 生产环境如何确定 Reference Date：TBD。

### D-029 KPI 使用集中数据组装契约

KPI 页面只消费 `KpiRow[]`。Repository 根据 `EhsFilterContext` 返回规范化 scoped snapshot，集中 KPI Domain service 评价 Store × Period normalized sources 并返回带 reason 的 Domain Results；KPI Builder 仅映射 presentation，ScoreContribution producer 消费同一结果。页面不读取 mock、不关联门店、不推断月份、不计算 KPI。

### D-030 数据可用性必须显式表达

KPI 数据使用 `AVAILABLE`、`CONFIRMED_EMPTY`、`INCOMPLETE`、`UNAVAILABLE`。Data Availability 只表达数据源覆盖/同步是否完整，不把“没有业务记录”解释为数据不完整。零条过滤结果不能自行证明数据完整；已有完整 coverage 的空集可返回 `CONFIRMED_EMPTY`，ASTM 只有在该完整空集时才返回 `NOT_OCCURRED`。

### D-031 KPI 使用规范化 Store ID

页面和 KPI Builder 只消费 `storeId`。TRTID 与可选 Store Name EN 到 `storeId` 的解析属于 Adapter / Repository，Store Name CN 不参与关联；UI 不假设 storeId 等于 TRTID。所有当前业务域复用 D-011 的 Store Resolution。

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

正式 Client Feature 不创建或导入 Repository implementation。Client 仅提交可序列化 query DTO；Server Action 在授权与 Repository 之前执行 runtime shape / type / enum / whitelist / bounds / date validation，再使用 server-only factory 创建当前 Repository，并返回 normalized async result。非法 query 返回受控 `INVALID_QUERY_INPUT` 错误，不使用默认值掩盖调用错误。Mock Repository 是当前 development implementation，不在 public barrel 中伪装为 Production。Actions、Events、Take Charge 在 Repository 中先完成完整 scoped result 的排序再分页；KPI、Stores、Environment 与 Certificates 当前保留 Client pagination。

### D-041 Mock Profile 只切换 server-only Dataset

`EHS_MOCK_PROFILE` 未设置、空值或 `standard` 时固定选择 Standard；`performance` 选择 deterministic Performance Dataset，其他非空值立即失败。两种 Profile 只在 Mock Source / Dataset 层不同，共用同一个 Mock Repository、Adapter、Store Resolution、availability、筛选、排序、分页及业务规则。Feature、UI、Server Action DTO 与 Repository public contract 不感知 Profile。Production 是未来独立 Repository implementation，不是第三个 Mock Profile。

## 9. 明确未决事项

Environment Analytics 的危险废物与一般工业固体废物合同持有率均以 Global Filters 组织范围内全部门店为分母；每店至少一条对应合同记录计入分子。合同到期数量固定统计 referenceDate 所在自然月，不受 Global Period 影响。

以下内容没有默认答案：

- 非完整自然月和自定义日期区间的 KPI 规则
- Training 与 Inspection 的 Requirement 集合来源
- 生产环境 Reference Date 的来源
- 危废/一般固废组合结果在两个独立类别列中的呈现方式
- Environmental Monitoring 的明细字段、频次与监测结果规则
- 数据库、API 物理结构、Production Identity Provider、刷新、持久化及视觉状态规范

### D-042 Access Management V1 权限真源

Base Grants 从组织联系人邮箱派生，不由管理员 CRUD；Manual Grants 在 Demo 中由独立 Mock Repository 保存，存在即生效、删除即失效，没有截止时间与过期状态。服务端合并授权、应用 Region / Area / Store 继承，并在业务数据返回前完成授权。GLOBAL_USER 有全局数据访问；GLOBAL_ADMIN 另可进入 /access 的手动权限管理与操作日志两个 Tab。`/dev/*` 原型路由可部署在 Production，但其服务端 route layout 仅允许 Effective Access 中 `canManageAccess` 的 GLOBAL_ADMIN 渲染，其他身份转至 `/no-access`。UI 只维护 Manual Grants，日志承担历史追踪；React 不计算权限。写入输入由 Server Action 做运行时解析，Access Service 拒绝导致有效 GLOBAL_ADMIN 为零的修改或删除。Production 必须将该检查与持久化写入纳入同一原子事务。

### D-043 Protected source 与未来部署边界

Dashboard 应用层 Effective Access 是业务数据范围权限的权威模型。普通用户未来无需直接读取受保护 SharePoint JSON；SharePoint source library ACL 只保护源文件，不是应用业务 scope 真源，也不与应用权限人工同步。Client 不直接访问受保护源文件。若未来采用静态 ASPX / JS / CSS 前端，仍须独立 Backend/API 承载身份、授权、受保护数据读取、Manual Grant mutation 与审计。具体 Azure / Backend 技术选型留给 Production Data Integration Pilot。本阶段未实现 SharePoint、生产身份或生产 Repository。

Production Integration TBD：Entra tenantId + objectId、Production Identity Provider、Azure Function / App Service 等受保护 API、SharePoint secure data access、Grant / Audit 持久化存储、first-admin bootstrap、authorization-aware cache isolation，以及 ASPX / SPFx 部署安全验证。Demo 的 `EHS_MOCK_USER_EMAIL` 仅供开发和模拟身份使用。

### D-044 Overview V1 ScoreContribution 与 pooled aggregation

- 12 个 V1 scoring metrics 对每个 Store × Month 均适用并固定 `availablePoints = 1`，不按 Store 排除 N/A。只有可证明 `ACHIEVED` 得 `earnedPoints = 1`；未达成、缺失、无效、格式错误、不完整或其它无法证明达成的情况均得 0/1，不排除 denominator。每 Store × Month 的 available points 总数为 12；Overview 不计算 completeness，全部 Store 参加排名。
- Score Rate 为 `sum(earnedPoints) / sum(availablePoints)`。Store、Area、Region 一律 pooled points；上层先汇总所有下级贡献再求比例，不平均下级 scoreRate。排名使用该 scoreRate 和 deterministic tie-break；变化为 current minus previous scoreRate。
- ScoreContribution 必须携带结果与诊断 reason。诊断至少区分 `ACHIEVED`、`RULE_NOT_MET`、`SOURCE_MISSING`、`SOURCE_INVALID`、`SOURCE_INCOMPLETE`；显式 N/A 另记录为 `NOT_APPLICABLE` 但仍计 0/1，缺少 required set/configuration 使用 `RULE_CONFIGURATION_MISSING`。原因只诊断数据/规则来源，不改变 points。
- V1 scoring catalog 在 `metric-rules.md` 冻结。Environment 当前不计分；未来可通过 Environment Domain Result 生成同一 ScoreContribution，不改 Overview 聚合。
- 每个 Store × Metric × Month 必须有一条贡献，包括全无数据的月份；source missing 使用 `0/1 + SOURCE_MISSING`。历史优先由 Domain historical records 按月末 referenceDate 重算，不可靠时后续采用 production snapshot；本决策不建立 snapshot。
- Mock V1 Training required item catalog 与 Inspection expected task set 由单一 provider 提供，Standard / Performance 共用；Production authoritative provider 后续替换。运行时缺少集合时输出 0/1 `RULE_CONFIGURATION_MISSING`，不得从实际记录反推。ASTM V1 方向已确认：`NOT_OCCURRED` 达成 1/1，`OCCURRED` 未达成 0/1；missing / invalid / incomplete 保留对应诊断原因。

具体 TypeScript contract 见 `data-contract.md`，领域结果映射和目录见 `metric-rules.md`。本决策冻结计算边界；Phase 2 已实现 Mock V2 与正式 Overview 接线，未定义 API 或 snapshot。

## 10. 项目技术决策（既有）

- shadcn/ui 作为基础 UI 系统。
- 复用顺序：本地组件 → shadcn/ui → shared component → 提议新增组件。
- 采用 Desktop First。
- 应用采用 Next.js App Router、React、TypeScript 和 Tailwind CSS。
- 页面路由共享 `DashboardShell`；导航集中在 `src/config/navigation.ts`。
- UI 仅通过 repository 抽象访问数据。
- 设计令牌只表达通用界面语义，不表达 EHS 业务状态。
- 真实数据库仍为 TBD。


### D-045 Architecture Hardening V1

Source → Normalize → Domain Result → KPI presentation / ScoreContribution → Overview pooled aggregation。Repository 不依赖 Feature/UI builder；`overview-production.ts` 通过 domain readers 编排，不读取 Mock fixture 或重算领域规则。source diagnostics 按可定位 Store × metric × Period 隔离；全 Dataset availability 不能覆盖其它门店贡献。Goals YTD 仅按注入的 reference year/month 与 Store scope 查询。保留 12 metrics / 12 available points、全部门店 ranking、pooled aggregation、Environment 不评分及 Standard/Performance 同规则。不新增结果缓存、API、Snapshot 或 Generic Rule Engine。

无法定位日期所属期间或 canonical Store 的 source defect 不得猜测；Production source scope / coverage 必须提供足够信息后才能消除保守诊断。


### D-046 Overview UI Polish V2

Overview、Certificates、Environment、Stores 的正式页面隐藏 Global Period，并且查询 DTO / identity 不接受 Period。Overview 的当前值为 reference month，与上一个自然月比较；趋势只含可用历史月。Environment 到期合同数固定统计 referenceDate 所在自然月，保持现有“按月份统计到期合同”的度量口径。维度变化显示实际得分差（分），得分率变化仍为 `currentScoreRate - previousScoreRate`，显示 `%`，不改成相对增长率。Overview Matrix 的 X/Y domain 在 preparation 层按真实 score / delta 与 padding 生成；重叠对象仍按精确原始坐标合并。Certificate Type mapping、Store × Category rule、Required Type configuration 与 12-point catalog 不变；Mock generator 覆盖完整 Store 集合并提供明确数据质量场景。


### D-047 Production API V1 与 Enterprise Access V1 接入边界

生产数据源是独立的 server-only Repository，不是 Mock Profile；`EHS_DATA_SOURCE=production` 必须显式选择，生产未配置 Repository、身份、导入存储或授权存储时失败关闭，不回退 Mock。Standard / Performance Mock 保留用于测试。

Production API 只接收原始业务事实及导入元数据，不接收 Dashboard 计算结果。批次须完成结构校验、Store Resolution、覆盖范围验证和请求记录数自洽校验后才能进入覆盖证明判定；请求内计数相等不证明来源完整。生产持久层须将批次发布与已发布数据指针原子提交。此决策不改变任何 Domain Rule、ScoreContribution 或 12-point invariant。

`GLIFE_CONTEXT` 是父页面经 origin/source 校验后提供的显示资料，不构成服务端认证凭据。Server Identity Provider 与 Machine Identity Provider 分离；受保护查询只接受服务端验证的身份，数据导入机器身份按 Domain 授权。生产身份协议、数据库、token 验证方式仍由公司集成确定。

Access 持续使用既有 Region / Area / Store 授权语义。企业 Access Repository 必须原子写入 Manual Grant 和 Audit，并在同一事务保证最后一名有效管理员约束。初始管理员必须绑定服务端验证的稳定 principalId，不能用客户端邮箱字符串触发；实际企业存储未配置前 Bootstrap 关闭。

### D-048 Production Import CAS、审计与覆盖证明

来源的 `COMPLETE` 只代表上传方声明；只有独立来源证明经企业配置的校验器验证后才是 `VERIFIED_COMPLETE`，可用于正式发布。记录数与请求内 `expectedRecordCount` 相等只校验请求自洽。没有可验证证明时批次保留 `DECLARED_COMPLETE` 并 fail closed，不发布；Pilot 启用也需由部署方明确设置可信验证器与环境策略。

Import Batch 使用单调 `revision`。Repository/数据库 Adapter 必须通过原子 compare-and-swap 确认预期 revision 和状态；验证仅能从当前 `RECEIVED` / `REJECTED` 转移，发布仅从当前 `VALIDATED + VERIFIED_COMPLETE` 转移。发布数据、指针、批次终态和成功审计必须在同一事务；回滚失败时维持旧发布。相同已发布 batch 的重复发布返回原发布结果。企业适配器必须落实唯一约束、CAS、事务隔离及失败回滚，不能以先读后无条件写入实现。

Import audit 的 principal ID 只能来自可信 Machine Identity Provider；`sourceSystem` 仅为来源描述。批次保留 source/configuration version、business/effective period、extraction/publication 时间与 request ID。Snapshot `referenceDate` 的历史冻结语义仍 TBD。Training 技术重复检查暂用 Store × Month × trainingName 复合键，不代表企业确认的自然键；企业接入需补充稳定 source record ID/自然键决策。
