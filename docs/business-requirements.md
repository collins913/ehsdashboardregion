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

Events 展示当前 Global Region / Area / Store / Period 范围内的 Event 明细。Period 统一按 `Event Date` 应用完整自然月半开区间。

页面支持：

- Event Type 筛选；选项来自当前 scoped normalized Event 数据，不在 UI 固定 taxonomy。
- Current Open / All 切换；默认 Current Open。
- Current Open 仅显示 `Status = Open`；All 显示 `Open` 与 `Closed`。
- 点击记录打开 Event Detail。

当前已知 source Event Type 包括 `Agency` 与 `Non-Agency Event`，未来新增 source value 时筛选与列表应自动支持。

### 6.2 列表与详情

列表默认显示 Store、Event ID、Event Type、Description、Event Time、Status；Submitted By 默认隐藏，可通过列显示控制。

Event Detail V1 仅展示已确认的公共字段：Store 中文名称、Event ID、Event Type、Status、`EventDetail.Description`、Submitted By、Event Time。页面和详情不展示 TRTID 或 Store English Name。

不同 Event Type 的专属详情字段仍为 TBD。本阶段不定义 Injury、Agency、Severity 等专属详情 schema，也不显示空的类型详情区域。

`ASTMInjuryIllness = "Yes"` 仍是 ASTM KPI 的事件源事实，但不作为 Events V1 默认列表或公共详情字段。

## 7. Risk & Compliance → Actions

### 7.1 页面目的

展示当前 Global Region / Area / Store / Period 范围内的 Action 明细。所有 Action 明细视图统一使用 `Submitted Date` 应用 Global Period；Performance → KPI 的 Closure Rate 仍保持独立 aggregate 语义。

### 7.2 页面行为

- 默认选择 Open，仅显示未关闭 Actions。
- 提供 Open / All 切换。
- Open 与 All 均使用 `Submitted Date` 应用 Global Period 的 `[startInclusive, endExclusive)`。
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

### 8.1 页面目的

核对门店所需证件是否齐全、是否有效，以及是否存在缺失或过期。

### 8.2 证件类别

页面提供 Certificate Category 筛选，默认包含五类：

- 安全证书
- 职业卫生证书
- 急救员
- 焊工证
- 内驾证

未来可扩展其它类别，不把数据结构限制为仅五类。

### 8.3 页面结构与交互

页面按 `Store × Certificate Category` 展示每个门店、每个证件类别的 Display Status：

- 无
- 异常
- 正常

其中“无”是缺少任何证件记录的原因提示，其 Business Result 为异常。

点击格子后：

- 若 Display Status 为“无”，显示该类别暂无证件记录。
- 若存在记录，展示已有证件及 Required Slot 匹配结果。
- 详情至少包括：Required Slot、Person、Role / Title、Certificate Type、Expiry Date、Display Status、Source Reference。

不提供到期提醒或“即将到期”状态。

### 8.4 Required Slot

- 每个 Certificate Category 可包含一个或多个 Required Slot。
- Slot 规则保留，并由集中业务逻辑维护。
- Slot 仅按 Certificate Type 精确匹配，不使用 Person、Role / Title。
- 一个证件记录只能匹配一个 Slot。
- 不新增别名或模糊匹配。

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

所有 Required Slot 满足后，未用于 Slot 匹配的证件仍作为额外记录展示；任一 Required Slot 证件或额外证件过期，整个类别均为异常。

## 9. Risk & Compliance → Environment

### 9.1 页面结构

页面按 `Store × Environment Category` 展示，提供 Environment Category 筛选。

默认类别：

- Hazardous Waste Contract
- General Solid Waste Contract
- Car Wash / Drainage Permit
- EIA
- Discharge Permit
- Environmental Monitoring

各类别读取集中规则结果，页面不重复判定。

### 9.2 危废与一般固废合同

业务要求同时核对危废合同和一般固废合同：

- 两种合同类别均必须存在。
- 缺少任一类别为异常。
- 任一相关合同过期为异常。
- 两种类别均存在且所有相关合同均有效时为正常。

该组合判定如何显示在两个独立类别列中：TBD。不得在未确认前复制为两个含义相同的结果。

### 9.3 洗车业务与排水许可

核对门店是否有洗车业务、是否持有排水许可及许可是否有效。结果为正常或异常，具体规则见 `metric-rules.md`。

### 9.4 EIA

- EIA Required 为 No 时正常。
- EIA Required 为 Yes 时必须存在 EIA Information。
- EIA 不进行有效期判断。

### 9.5 Discharge Permit

- Discharge Permit Required 为 No 时正常。
- Required 为 Yes 时必须存在 Permit Information，且许可未过期。

### 9.6 Environmental Monitoring

页面格子仅显示：

- 无：当前筛选范围内没有环境监测记录。
- 查看：存在环境监测记录。

点击“查看”打开该门店环境监测明细。

- 环境监测明细字段：TBD，待真实数据源确认。
- “无”仅表示没有记录，不进行正常或异常判断。
- 监测结果是否达标及如何判定：TBD。

## 10. Stores → Store Detail

### 10.1 业务边界

Stores 仅用于查看和核对 Store Master Data，不展示或计算 Performance、KPI、Goals、Events、Actions、Certificates、Environment。

这些业务信息通过 Global Filters 与对应业务页面查看。

### 10.2 默认显示字段

Stores 列表默认勾选并显示七个字段：

- Region
- Area
- Store Name CN
- Store Name EN
- TRTID
- Manager
- EHS Ambassador

未来允许增加其它门店主数据字段；新增字段是否默认显示：TBD。

### 10.3 列表与详情

列表支持：

- 搜索
- 排序
- 列显示控制

上述功能优先放在表格标题行或表头区域。只有后续复杂度确有需要时才增加独立工具栏。

点击门店后，仅展示该门店完整主数据，当前至少包括上述七个字段。

### 10.4 空值

- 主数据字段缺失时显示 `—`。
- 前端不得自行补造数据。

### 10.5 门店关联

- TRTID 是重要门店标识，但不保证是所有数据源的唯一关联键。
- 数据源可能使用 TRTID、Store Name CN 或 Store Name EN 关联门店。
- 关联必须由数据层统一完成，页面和业务组件不得临时匹配。
- Events 与 Actions 复用 TRTID 优先、Store English Name fallback、冲突不静默匹配的 Store Resolution；其它数据源策略仍为 TBD。

## 11. 本次不定义

- Overview 健康度、评分、排序和汇总规则
- 权限模型
- 数据库表、物理字段名、字段类型、约束与索引
- API 路由、请求和响应格式
- 数据刷新频率与持久化方式
- 时区、日期边界和生产环境 Reference Date 的来源
- 未明确的状态字典与视觉颜色
