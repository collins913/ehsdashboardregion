# EHS Dashboard 已确认决策

- 版本：V1（整理版）
- 日期：2026-09-10
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

### D-004 先定义底层业务，再定义 Overview

Overview 只汇总前述模块的统一结果，不产生另一套业务事实或重复计算。健康度、评分和汇总规则待底层业务稳定后另行定义。

## 3. 业务与技术边界

### D-005 Performance 与 Risk & Compliance 分层

- Performance 展示计算后的 KPI 与 Goal 结果。
- Risk & Compliance 展示底层业务记录及合规结果。
- 明细页与 KPI 不各自维护同一事实的两套算法。

### D-006 业务规则不得散落在页面组件

Training、Drill、Inspections、ASTM、Actions Open 分类、Certificates、Environment 等判定由集中业务逻辑维护。页面组件只消费结果。

### D-007 数据源直接值不得由 Dashboard 重算

以下值由后续数据源直接提供：

- Action Closure Rate
- Take Charge Submissions per Capita
- Take Charge Close Rate
- Take Charge Participate Rate

Dashboard 不根据明细猜测分子、分母或人员基数。

### D-008 未确认的业务含义必须保留为 TBD

不得自行补全公式、阈值、状态、筛选关系、数据库字段、权限、日期边界或异常处理。

## 4. 门店主数据与关联

### D-009 Store Detail 只核对主数据

Store Detail 不承载 Performance 或 Risk & Compliance 内容，也不进行 KPI、风险或合规计算。

### D-010 默认显示七个门店字段

Stores 列表默认勾选：Region、Area、Store Name CN、Store Name EN、TRTID、Manager、EHS Ambassador。未来允许扩展字段。

### D-011 TRTID 不是所有数据源的强制唯一关联键

不同数据源可能通过 TRTID、Store Name CN 或 Store Name EN 关联门店。必须由数据层统一执行 Store Mapping / Resolution；页面不得自行匹配。

### D-012 Stores 列表交互位置

搜索、排序和列显示控制优先整合在表格标题行或表头区域。

## 5. Performance

### D-013 KPI 业务对象固定为五项

V1 KPI 为 Training、Drill、Actions、Inspections、Events。

### D-014 Training、Drill、Inspections 为达成型 KPI

- Training：纳入 Period 的每个月必修培训均全员完成才达成。
- Drill：纳入 Period 的每个月至少完成一次演练才达成。
- Inspections：Period 内要求完成的 Inspection 全部完成才达成。

不为这三项强行生成未经确认的百分比。

### D-015 Events KPI 展示是否发生 ASTM Incident

Events KPI 展示“发生 / 未发生”，不展示事故数量。

ASTM 不维护独立数据源；以 Events 的 Severity 作为判断输入。Severity 的具体映射仍为 TBD。

### D-016 Goal 名称、目标和精度

| Goal | 目标 | 展示精度 |
|---|---:|---:|
| Take Charge Submissions per Capita | >= 4 | 1 位小数 |
| Take Charge Close Rate | >= 90% | 0 位小数 |
| Take Charge Participate Rate | >= 50% | 0 位小数 |

三个值均跟随 Global Period，由数据源直接提供。

## 6. Events 与 Actions

### D-017 Events 使用一套记录、两个 Event Type

规范业务类型为：

- `Agency`：政府检查
- `Non-Agency Event`：非政府检查事件

其中 Non-Agency Event 提供 Severity，供 ASTM 判定。ASTM 不在 Events 页面单独建立模块。

### D-018 Events 与 Actions 默认显示 Open

两个页面均提供 Open / All 切换，并默认 Open。

- Actions 已确认 `Assigned`、`InProgress` 为未关闭，`Closed` 为已关闭，`Cancelled` 不属于未关闭。
- Events 的 Open 状态映射尚未确认。

### D-019 Action Closure Rate 与 Action 明细分离

Actions 页面展示明细；KPI 页面读取数据源提供的 Action Closure Rate，不从明细重算。

## 7. Certificates

### D-020 默认五类证件并保留 Required Slot

默认类别为安全证书、职业卫生证书、急救员、焊工证、内驾证。类别允许扩展。Required Slot 由集中规则维护。

### D-021 “无”是展示原因，同时归类为异常

证件类别完全没有任何记录时：

- Display Status：无
- Business Result：异常

有记录但缺 Required Slot 或存在过期证件时显示异常；全部满足且有效时显示正常。

### D-022 不提供证件到期提醒

V1 不设置“即将到期”状态，不定义提前提醒天数，也不实现到期提醒功能。

## 8. Environment

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

## 9. 明确未决事项

以下内容没有默认答案：

- Global Filters 的数据源、默认值、单/多选与联动
- 非完整自然月和自定义日期区间的 KPI 规则
- Training 与 Inspection 的 Requirement 集合来源及缺记录处理
- Action Closure Rate 的目标及达标规则
- Events Source Status 的 Open 分类
- Severity 到 ASTM Incident 的映射
- Required Slot 完整清单及证件匹配规则
- 证件和许可有效期的比较基准与空值处理
- 危废/一般固废组合结果在两个独立类别列中的呈现方式
- Environmental Monitoring 的明细字段、频次与监测结果规则
- Store Resolution 的优先级、冲突与未匹配处理
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
