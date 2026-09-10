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

其中 Period 的表达格式、时区、起止边界和月份纳入规则：TBD。

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

### 2.3 Source Reference

原文件中的 `Source / Link` 统一称为 `Source Reference`。其目的仅为追溯业务记录来源。

以下结构尚未确认：

- 是单一链接、来源系统标识，还是二者组合：TBD
- 是否必填：TBD
- 链接格式和访问权限：TBD

### 2.4 Status 分层

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
- Action Closure Rate Value

以下尚未确认：

- Value 使用 0–1 还是 0–100：TBD
- Numerator、Denominator 是否一并提供：TBD
- Source Reference 和更新时间：TBD

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
- Severity

Severity 到 ASTM Incident 的映射字典：TBD。

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

百分比编码、空值、更新时间与 Source Reference：TBD。

### 5.2 Take Charge Record

人均提交数与 Close Rate 点击明细至少需要：

- Store Reference
- 提交人
- 提交日期
- 摘要
- Source Status
- Source Reference

Close Rate 明细需要能够识别“未关闭”，但 Source Status 到未关闭的映射：TBD。

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
| Source Status | 数据源原始状态；状态字典 TBD |
| Source Reference | 追溯来源；结构 TBD |

### 6.2 Non-Agency Event 附加字段

- Severity

Severity 既用于事件详情，也作为 ASTM Incident 规则输入。Severity 字典与 ASTM 映射：TBD。

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
| Closed Date | 数据源提供；空值含义 TBD |
| Source Status | 数据源提供 |
| Source Reference | 数据源提供；结构 TBD |

当前已知 Source Status：

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
- Expiry Date
- Source Reference

数据源如有可额外提供：

- Certificate Number
- Issue Date

最终 Display Status 与 Business Result 不由数据源提供，由证件规则计算。

### 8.2 Certificate Requirement

Slot 匹配另需一套逻辑要求数据：

- Certificate Category
- Required Slot
- Slot 所需的人员、岗位或证件条件

以下尚未确认：

- 五类证件的完整 Required Slot 清单：TBD
- Person、Role / Title、Certificate Type 的匹配优先级：TBD
- 证件名称别名：TBD
- Requirement 的来源与维护方式：TBD

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
- Expiry Date
- Source Reference

Contract Category 至少能区分：

- Hazardous Waste Contract
- General Solid Waste Contract

合同编号、生效日期、重复记录和多份合同适用关系：TBD。

### 9.2 Car Wash / Drainage Permit

至少需要：

- Store Reference
- Has Car Wash
- Has Drainage Permit
- Permit Expiry Date
- Source Reference

布尔值编码、空值与不适用值：TBD。

### 9.3 EIA

至少需要：

- Store Reference
- EIA Required
- EIA Information
- Source Reference

EIA Required 的布尔值编码，以及 EIA Information 的最小有效结构：TBD。

EIA 不需要 Expiry Date。

### 9.4 Discharge Permit

至少需要：

- Store Reference
- Discharge Permit Required
- Permit Information
- Expiry Date
- Source Reference

Required 的布尔值编码与 Permit Information 的最小有效结构：TBD。

### 9.5 Environmental Monitoring Record

当前只要求数据层能够回答：当前筛选范围是否存在记录，并支持点击后读取明细。

明细字段、监测结果、频次、日期、机构和 Source Reference：TBD，待真实数据源确认。

## 10. 规则结果输出边界

后端或集中业务层应向页面提供规范化结果；具体 API Schema 尚未确定。

至少需要区分以下概念：

| 结果 | 必要含义 |
|---|---|
| KPI Result | 达成/未达成、发生/未发生或直接数值 |
| Goal Result | 直接值及按已确认阈值得出的达成结果 |
| Certificate Display Status | 无、异常、正常 |
| Certificate Business Result | 异常、正常 |
| Environment Display Status | 类别结果；监测为无/查看 |
| Environment Business Result | 已定义类别的正常/异常；Environmental Monitoring 不因记录存在性输出此结果 |

字段命名、枚举编码和错误返回结构：TBD。
