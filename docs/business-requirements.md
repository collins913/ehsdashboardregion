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
- 各 KPI 的最终标签与视觉规则：TBD
- Severity 仅用于描述和展示，不参与 ASTM Incident 判定。

具体判定见 `metric-rules.md`。

## 5. Performance → Goals

Goals 均跟随 Region、Area、Store、Period。

### 5.1 Take Charge Submissions per Capita

统一名称为 `Take Charge Submissions per Capita`（Take Charge 人均提交数），不使用 `Submit Rate`。

- 页面展示：数值，保留 1 位小数。
- 目标值：大于或等于 4。
- 点击后：展示当前筛选范围内的 Take Charge 记录。
- 明细至少包括：提交人、提交日期、摘要、Source Status、Source Reference。

### 5.2 Take Charge Close Rate

- 页面展示：百分比，保留 0 位小数。
- 目标值：大于或等于 90%。
- 点击后：仅展示当前筛选范围内未关闭的 Take Charge 记录。
- 明细至少包括：提交人、提交日期、摘要、Source Status、Source Reference。

Take Charge 的 `Status` 为 `ClosedWithAction`、`ClosedWithoutAction`、`Declined` 时归类为 Closed；其它值归类为 Open。该分类由集中业务规则维护。

### 5.3 Take Charge Participate Rate

- 页面展示：百分比，保留 0 位小数。
- 目标值：大于或等于 50%。
- 点击后：区分已提交人员与未提交人员。
- 明细至少包括：人员姓名、是否提交、Source Reference。

三个 Goal 的数值均由数据源直接提供，Dashboard 不计算分子、分母或人均值。百分比统一使用 0–100 表示。

## 6. Risk & Compliance → Events

### 6.1 页面目的与结构

Events 展示两类业务记录：

- 事故事件
- 政府检查

统一使用 `Event Type` 区分，规范值为：

- `Agency`：政府检查
- `Non-Agency Event`：非政府检查事件

页面支持：

- Global Filters
- Event Type 筛选
- Open / All 切换

默认选择 Open，仅显示 `Status !== "Closed"` 的记录；All 不按关闭状态过滤。原始 `Status` 值保留用于详情展示。

### 6.2 事故事件

列表及详情所需核心信息：

- Event ID
- Store
- Event Date Time
- Event Type
- Severity
- ASTMInjuryIllness
- Title / Summary
- Status
- Source Reference

要求：

- Event Date Time 为一个完整日期时间字段，由数据源提供。
- 不需要 Due Date 或 Closed Date。
- `ASTMInjuryIllness = "Yes"` 表示 ASTM Incident；其它值均不表示 ASTM Incident。
- Severity 仅用于描述和展示。
- ASTM Incident 不在本页面单独建立模块。
- 点击记录打开事件详情。

### 6.3 政府检查

列表及详情所需核心信息：

- Event ID
- Store
- Event Date Time
- Event Type
- Title / Summary
- Status
- Source Reference

点击记录打开政府检查详情。

## 7. Risk & Compliance → Actions

### 7.1 页面目的

展示当前 Region / Area / Store 范围内仍需处理的 Action 明细。该明细不按 Global Period 排除历史遗留 `OPEN` Actions；KPI 百分比仍严格跟随 Global Period。

### 7.2 页面行为

- 默认选择 Open，仅显示未关闭 Actions。
- 提供 Open / All 切换。
- Open 包含 `Assigned`、`In Progress`、`In Review`、`Sign Off`。
- `Closed` 为已关闭。
- `Cancelled` 为已排除，不属于未关闭；不得与 `Closed` 合并。
- Performance → KPI 的 Actions 下钻只显示 `RecordState = OPEN`；`CLOSED`、`EXCLUDED`、`UNKNOWN` 不显示。
- 下钻明细用于追踪当前仍需整改的行动项，不要求与当前 Period 的 Closure Rate aggregate 分子、分母对账。
- 未来新增源状态的分类：TBD；页面不得自行猜测。

### 7.3 列表与详情

列表建议显示：

- Store
- Action Title
- Owner
- Created Date
- Due Date
- Status

Closed Date 默认作为表格列还是仅在详情中展示：TBD。

点击记录后展示：

- Action ID
- Store
- Action Title
- Owner
- Created Date
- Due Date
- Closed Date
- Status
- Source Reference

### 7.4 与 KPI 的关系

- Actions 页面展示明细记录。
- KPI 页面展示数据源直接提供的 Action Closure Rate。
- KPI 不从 Actions 页面明细重新计算关闭率。

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
- 各数据源的匹配字段、优先级、冲突与异常处理：TBD。

## 11. 本次不定义

- Overview 健康度、评分、排序和汇总规则
- 权限模型
- 数据库表、物理字段名、字段类型、约束与索引
- API 路由、请求和响应格式
- 数据刷新频率与持久化方式
- 时区、日期边界和生产环境 Reference Date 的来源
- 未明确的状态字典与视觉颜色
