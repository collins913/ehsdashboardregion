# EHS Dashboard 业务需求

- 版本：V1（整理版）
- 日期：2026-09-10
- 状态：已确认内容与明确 TBD 的实施依据

## 1. 文档职责

本文定义页面需要展示什么、支持什么交互，以及各模块的业务边界。

- 计算与判定规则见 `metric-rules.md`。
- 逻辑数据需求见 `data-contract.md`。
- 已冻结的跨模块决策见 `decisions.md`。
- 四份文档用于约束设计与开发，不是可由代码直接导入的配置文件。

## 2. 范围与信息架构

V1 包含以下业务页面：

```text
Overview

Performance
├── KPI
└── Goals

Risk & Compliance
├── Events
├── Actions
├── Certificates
└── Environment

Stores
└── Store Detail
```

本次仅整理以下七个已定义模块：KPI、Goals、Events、Actions、Certificates、Environment、Store Detail。Overview 不在本次定义范围内。

## 3. 通用要求

### 3.1 Global Filters

Global Filters 属于全局应用框架，包含：

- Region
- Area
- Store
- Period

除下述例外外，各业务页面均跟随当前 Global Filters：

- Stores 页面使用 Region、Area、Store。
- Period 对 Store Master Data 没有业务意义，不参与门店主数据筛选、判断或计算。
- Environment 仅跟随 Region、Area、Store，忽略 Period 与 referenceDate。
- Certificates V1 仅跟随 Region、Area、Store，忽略 Period；有效期使用独立 referenceDate。
- Certificates、Environment、Stores 的查询就绪与查询身份仅依赖有效门店范围；Period 改变或自定义 Period 暂未完整时，不重新查询、不 loading、不清空页面。

V1 已确认：

- Region、Area 初始为 `ALL`，支持 `ALL` 或单选。
- Store 初始为 `ALL`，支持 `ALL`、单个或多个 canonical `storeId`。
- Region 变化时清除无效 Area 与 Store；Area 变化时清除无效 Store。
- Period 默认本季度，支持本年、本季度、本月及自定义完整自然月范围；本季度和本年均截至当前自然月，不纳入未来月份。
- Period 使用 `Asia/Shanghai`，不支持具体日期、部分月份或自定义日范围。

### 3.2 规则执行边界

- 页面组件只展示数据与统一规则结果，不自行实现业务判定。
- 数据源直接提供的值不得由页面根据明细临时重算。
- 需要计算的结果由集中业务逻辑产生。
- 状态标签、颜色和其它视觉映射，除本文明确内容外均为 TBD。
- 缺失数据不得由前端补造；已明确的空值展示规则除外。

### 3.3 术语

| 术语 | 统一含义 |
|---|---|
| Store | 门店业务实体 |
| TRTID | 内部门店标识；不称为 Store ID，也不保证是所有数据源的唯一关联键 |
| Source Reference | 原文 `Source / Link` 的统一名称；可选包含 sourceSystem、sourceRecordId、sourceUrl |
| Source Status | 数据源提供的原始状态 |
| Display Status | 页面显示的状态或文案 |
| Business Result | 供汇总或业务判断使用的结果 |
| Required Slot | 某证件类别必须满足的人员、岗位或证件要求 |
| ASTMInjuryIllness | Event 数据源提供的 ASTM 标识；`Yes` 表示 ASTM Incident，其它值均表示非 ASTM Incident |

## 4. Performance → KPI

### 4.1 页面目的

展示 Global Filters 当前门店范围与统计周期内的五项 KPI 结果：

- Training
- Drill
- Actions
- Inspections
- Events

### 4.2 展示要求

| KPI | 页面结果 | 数据来源或入口 |
|---|---|---|
| Training | 达成 / 未达成 | 月度培训记录 |
| Drill | 达成 / 未达成 | 月度演练记录 |
| Actions | Action Closure Rate 百分比 | 数据源直接提供的汇总值 |
| Inspections | 达成 / 未达成 | Inspection 记录 |
| Events | 发生 / 未发生 ASTM Incident | Events 记录中的 `ASTMInjuryIllness` |

Action Closure Rate 在完整 Coverage 下确认没有需要整改的 Action 时，`null` 显示“无”；不得转换为 `0%` 或 `100%`。只有实际数值 `0` 显示 `0%`。

目标、阈值和视觉状态：

- Actions：Action Closure Rate `>= 90%` 为达成，`< 90%` 为未达成。
- Action 数据源 Coverage 完整且确认当前范围没有需要整改的 Action 时，aggregate 可为 `null`，结果为达成并显示“无”；不得伪造成 `100%`。
- Action 数据源不可用、Coverage 不完整或当前 Period 完整性无法确认时，结果为未确定且显示 Data Availability，不显示“无”。
- KPI 状态中文标签和 semantic intent 以 `status-dictionary.md` 为准；共享展示由 `StatusDisplay` 统一实现，页面不得重复映射。

具体判定见 `metric-rules.md`。

## 5. Performance → Goals

Goals V1 展示 Take Charge 的四项结果。全部指标跟随 Region、Area、Store；Global Period 只影响提交总数与关闭率。今年平均提交数、今年参与率固定使用 Dashboard `referenceDate` 所在自然年的 1 月至当前月。

### 5.1 提交总数

- 按当前 Global Period 内 `Submitted At` 统计 Take Charge 记录数。
- 完整 Coverage 下无记录显示 `0`。

### 5.2 关闭率

- 分母为当前 Global Period 内全部 Take Charge 记录数。
- 分子为其中 `ClosedWithAction`、`ClosedWithoutAction`、`Declined` 的记录数。
- 多月先汇总分子与分母，再计算百分比；禁止平均月度关闭率。
- 目标值：`>= 90%`。
- 完整 Coverage 下无记录时显示“无”，不显示 `0%` 或 `100%`。

### 5.3 今年平均提交数

- 使用数据源提供的当前组织范围年度累计 aggregate，不平均门店最终指标。
- 目标值：`>= 4`，展示 1 位小数。
- 不受 Global Period 影响。

### 5.4 今年参与率

- 使用数据源提供的当前组织范围年度累计 aggregate，不平均门店最终指标。
- 目标值：`>= 50%`，展示 0 位小数。
- 不受 Global Period 影响。

Take Charge 明细按 `Submitted At` 使用 Asia/Shanghai 自然月半开区间。默认“当前未关闭”只显示 `RecordState = OPEN`；“全部”包含 OPEN、CLOSED 与 UNKNOWN。该视图切换只影响明细，不影响顶部四项汇总。表格展示门店、TCH ID、提交人、提交时间、摘要、Status；TRTID 仅用于 Store Resolution，不向用户展示。

## 6. Risk & Compliance → Events

### 6.1 页面目的与结构

Events 展示当前 Global Region / Area / Store / Period 范围内的 Event 明细。Period 统一按事件时间应用完整自然月半开区间；底层稳定字段仍为 `Event Date` / `eventDate`。

页面支持：

- Event Type 筛选；选项来自当前 scoped normalized Event 数据，不在 UI 固定 taxonomy。
- Current Open / All 切换；默认 Current Open。
- Current Open 仅显示 `RecordState = OPEN`；All 保留当前范围全部记录，当前已确认源状态为 `Open` 与 `Closed`，未知未来值保留原文并归类 `UNKNOWN`，不进入 Current Open。
- 点击记录打开 Event Detail。

当前已知 source Event Type 包括 `Agency` 与 `Non-Agency Event`，未来新增 source value 时筛选与列表应自动支持。

### 6.2 列表与详情

列表默认显示 Store、Event ID、Event Type、Description、Event Time、Status；Submitted By 默认隐藏，可通过列显示控制。

Event Detail V1 仅展示已确认的公共字段：Store 中文名称、Event ID、Event Type、Status、`EventDetail.Description`、Submitted By、Event Time。页面和详情不展示 TRTID 或 Store English Name。

不同 Event Type 的专属详情字段仍为 TBD。本阶段不定义 Injury、Agency、Severity 等专属详情 schema，也不显示空的类型详情区域。

`ASTMInjuryIllness = "Yes"` 仍是 ASTM KPI 的事件源事实，但不作为 Events V1 默认列表或公共详情字段。

## 7. Risk & Compliance → Actions

### 7.1 页面目的

展示当前 Global Region / Area / Store / Period 范围内的 Action 明细。所有 Action 明细视图统一使用提交时间应用 Global Period；底层稳定字段仍为 `Submitted Date` / `submittedDate`。Performance → KPI 的 Closure Rate 保持独立 aggregate 语义。

### 7.2 页面行为

- 默认选择 Open，仅显示未关闭 Actions。
- 提供 Open / All 切换。
- Open 与 All 均使用提交时间应用 Global Period 的 `[startInclusive, endExclusive)`。
- Open 包含 `Assigned`、`In Progress`、`In Review`、`Sign Off`。
- `Closed` 为已关闭。
- `Cancelled` 为已排除，不属于未关闭；不得与 `Closed` 合并。
- Performance → KPI 的 Actions 下钻使用相同 Region / Area / Store / Period 范围，只显示 `RecordState = OPEN`；相同筛选下应与本页面 Open 视图返回相同 Action ID。
- 下钻明细用于追踪当前仍需整改的行动项，不要求与当前 Period 的 Closure Rate aggregate 分子、分母对账。
- 未来新增源状态的分类：TBD；页面不得自行猜测。

### 7.3 列表与详情

列表默认显示 Store、Action ID、Problem、Action、Due Date、Status；Owner、Submitted By、Submitted Date、Closed Date 作为默认隐藏列，可通过列显示控制。

点击记录后展示：

- Action ID
- Store
- Problem
- Action
- Owner
- Submitted By
- Submitted Date
- Due Date
- Closed Date
- Status

Closed Date 为空时显示 `—`。页面和详情不展示 TRTID 或 Store English Name。

### 7.4 与 KPI 的关系

- Actions 页面展示明细记录。
- KPI 页面展示数据源直接提供的 Action Closure Rate。
- KPI 不从 Actions 页面明细重新计算关闭率。
- KPI Actions 下钻与 Actions 页面 Open 视图复用同一规范化明细查询；Actions 页面 All 视图在相同范围内保留全部 RecordState。

## 8. Risk & Compliance → Certificates

### 8.1 Certificates V1

一行一个 canonical Store，默认五列：门店、安全健康、急救员、特种作业、安全驾驶。门店仅显示 Store Master 中文名称。类别格子只展示“正常 / 异常”，支持排序、列显示控制与 adaptive pagination。

### 8.2 Type 与 Category

Category 不来自源数据，仅通过集中 Certificate Type exact mapping 得到：

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

不使用别名、模糊匹配、Person 或 Business Title。未知 Type 保留原值，不猜测类别，不参与四个已定义类别的计算。

### 8.3 状态与筛选

证件有效期按 Dashboard referenceDate 评价：到期日当天有效；过期、缺失或无效日期均异常。类别无记录或任一记录异常则异常，否则正常。不检查证件种类是否齐全，不实现 Required Slot、人数要求或到期提醒。

Region / Area / Store 生效；Period ignored，变化不查询、不 loading，不与 referenceDate 混用。Raw 仅含 TRTID、English Store Name、Certificate Type、Expiry Date、Person、Person Email、Business Title；门店解析复用既有 TRTID primary / English fallback、conflict 与历史名称语义。

### 8.4 Detail

详情按当前 normalized records 中实际出现的 Certificate Type 分组，类别内各 Type 纵向展示，同 Type 的全部记录使用纵向 label/value 展示。新增已规范化 Type 自动形成新 section，不硬编码 Type 或自动渲染全部字段。

四类别共用详情结构。Header 显示中文门店名、类别和类别状态。无记录时显示“当前分类暂无证件记录”，类别状态仍异常。有记录时显示 Type、Person、Person Email、Business Title、Expiry Date、距离到期天数与每张记录的状态；未知天数显示“—”，负数保留。未来字段通过明确契约扩展，不提前设计字段或工作流。

本次用户确认的 V1 覆盖旧五类别、Required Slot、“无”展示及缺日期未确定规则；历史决策中与此冲突的 Certificates 定义不再适用于本轮 V1。

## 9. Risk & Compliance → Environment

### 9.1 Environment 门店表

固定默认六列：门店、设施信息、环保证照、应急预案、监测、废弃物合同。门店只显示 Store Master 的中文名称；其余五列仅提供统一“查看”入口，不在主表展示状态、日期、编号或数量。

Environment 当前仍不产生正常、异常、评分或其它 Business Result。页面只展示 normalized source data，不根据自由文本、缺失值或日期推断业务结论。支持 scoped 集合排序、列显示控制与 adaptive pagination。

### 9.2 数据与筛选边界

Raw Source 使用 TRTID、English Store Name 与显式 typed Environment detail fields，不保存中文门店名。完全复用已有 TRTID 优先、英文名辅助的 Store Resolution，保留 fallback、conflict 与历史名称语义；UI 只消费 canonical Store。

Region / Area / Store 有效，Period 与 referenceDate 当前均不参与查询身份。日期仅按 date-only 源值展示，不计算有效性。

### 9.3 Detail Expansion

五个入口共用一个 Detail Sheet。设施信息当前仅显示“详情字段待定义”。环保证照包含环境影响评价、排污许可、排水许可三个可展开 section；六项环境影响评价总量要求以吨/年原样展示，不计算合计，排污许可的产能与涂料批复用量不补造单位。应急预案仅展示备案情况、备案编号、有效期起止和备注。监测保留当前已有值，并标记其余字段待定义。

废弃物合同按危险废物处置合同、一般工业固体废物处置合同两个分类纵向展示，每份记录包含供应商名称、种类、有效期起止。任一分类允许零到任意数量记录；全部保留，不去重、不限数量、不自动选择最新记录。无记录仅显示空状态，不产生异常结论。

既有 `metric-rules.md` 中的环境合规需求不属于本次 Detail Expansion；不得将其套用于当前 typed detail data。后续合规功能及真实详情输入另行确认。

## 10. Stores → Store Detail

### 10.1 业务边界

Stores 仅用于查看和核对 Store Master Data，不展示或计算 Performance、KPI、Goals、Events、Actions、Certificates、Environment。

这些业务信息通过 Global Filters 与对应业务页面查看。

### 10.2 默认显示字段

Stores 列表默认勾选并显示六列：Store Name CN、Region、Area、TRTID、Manager、EHS&S 代表。Store Name EN 在 Store Detail 中展示。

未来允许增加其它门店主数据字段；新增字段是否默认显示：TBD。

### 10.3 列表与详情

列表支持排序、列显示控制与 adaptive pagination。排序作用于完整 scoped Store 集合，再进行分页。

上述功能优先放在表格标题行或表头区域。只有后续复杂度确有需要时才增加独立工具栏。

点击门店后，仅展示中文门店名、英文门店名、TRTID、Region、Area、Manager、EHS&S 代表。底层稳定字段名可继续使用 `ehsAmbassador`。

### 10.4 空值

- 主数据字段缺失时显示 `—`。
- 前端不得自行补造数据。

### 10.5 门店关联

- TRTID 是重要门店标识，但不保证是所有数据源的唯一关联键。
- 数据源可能使用 TRTID、Store Name CN 或 Store Name EN 关联门店。
- 关联必须由数据层统一完成，页面和业务组件不得临时匹配。
- Events、Actions、Environment V1 与 Certificates V1 复用 TRTID 优先、Store English Name fallback、冲突不静默匹配的 Store Resolution；其它数据源策略仍为 TBD。

## 11. 本次不定义

- Overview 健康度、评分、排序和汇总规则
- 权限模型
- 数据库表、物理字段名、字段类型、约束与索引
- API 路由、请求和响应格式
- 数据刷新频率与持久化方式
- 生产环境 Reference Date 的来源；业务时区与 Period 边界已由 Global Filters 规则冻结
- 未明确的状态字典与视觉颜色
