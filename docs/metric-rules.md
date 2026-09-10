# EHS Dashboard 指标与状态规则

- 版本：V1（整理版）
- 日期：2026-09-10
- 状态：已确认规则与明确 TBD 的业务判定依据

## 1. 文档职责

本文只定义“如何计算、如何判定”。页面结构见 `business-requirements.md`，输入数据见 `data-contract.md`。

## 2. 共同规则

1. 除 Store Master Data 外，所有结果均基于 Global Filters 当前 Region、Area、Store、Period。
2. 规则在集中业务逻辑中执行，页面组件不得自行计算。
3. 数据源直接提供的汇总值只负责格式化展示与已确认阈值判定，不从明细重算。
4. 原始数据缺失、空值或未知枚举不得自动视为 No、0、正常或已关闭；未定义情况返回 TBD/不可判定的具体处理方式仍为 TBD。
5. 日期有效性的比较基准、时区和边界包含关系：TBD。
6. 状态颜色、图标、严重等级和 Overview 汇总权重：TBD。
7. 百分比值在应用内部统一使用 0–100；外部数据源如使用其它表示，由 repository/adapter 转换。

## 3. Performance → KPI

### 3.1 Training

判定对象：纳入当前 Period 的每个自然月、每家 Store 的月度必修培训。

```text
每个纳入月份的必修培训均为全员完成
→ 达成

任一纳入月份存在未全员完成的必修培训
→ 未达成
```

以下情况尚未定义：

- 非完整自然月是否纳入：TBD
- 自定义日期区间的首尾月份如何处理：TBD
- “必修培训集合”由哪个数据源界定：TBD
- 完全没有培训记录时如何判定：TBD
- 全员完成对应的源状态值：TBD

### 3.2 Drill

要求：每家 Store 每个纳入月份至少完成 1 次演练。

```text
所有纳入月份的已完成演练数 >= 1
→ 达成

任一纳入月份的已完成演练数 = 0
→ 未达成
```

- Drill Name 仅用于明细展示，不参与判定。
- 非完整月份处理沿用 3.1 的 Period Rule，当前为 TBD。
- 哪些源状态计为“已完成”：TBD。

### 3.3 Actions

- 指标：Action Closure Rate。
- Value：数据源直接提供的百分比。
- Dashboard 不计算 Numerator 或 Denominator。
- 页面格式：百分比。
- Target：TBD。
- 达成/未达成规则：TBD。

### 3.4 Inspections

判定对象：数据源提供的当前筛选范围内、该 Store 要求完成的全部 Inspection。

```text
全部 Inspection 完成
→ 达成

任一 Inspection 未完成
→ 未达成
```

以下情况尚未定义：

- 哪些源状态计为完成：TBD
- 没有 Inspection 记录时如何判定：TBD
- Requirement 集合由哪个数据源界定：TBD

### 3.5 Events / ASTM Incident

判定对象：当前筛选范围内的 Event 记录。

```text
存在至少一条 ASTMInjuryIllness = "Yes" 的记录
→ 发生

不存在 ASTMInjuryIllness = "Yes" 的记录
→ 未发生
```

- ASTM KPI 不维护独立数据源。
- ASTM 判定只读取数据源字段 `ASTMInjuryIllness`。
- `ASTMInjuryIllness = "Yes"` 表示 ASTM Incident；其它值均不表示 ASTM Incident。
- Severity 仅用于描述和展示，不参与 ASTM 判定。
- 页面展示“发生 / 未发生”，不展示事故数量。

## 4. Performance → Goals

三个值均由数据源直接提供，Dashboard 不重算。

### 4.1 Take Charge Submissions per Capita

```text
Value >= 4
→ 达成

Value < 4
→ 未达成
```

- 展示精度：1 位小数。
- Value 缺失时的显示与业务结果：TBD。

### 4.2 Take Charge Close Rate

```text
Value >= 90%
→ 达成

Value < 90%
→ 未达成
```

- 展示精度：0 位小数。
- 百分比值使用 0–100。
- Value 缺失时的显示与业务结果：TBD。

### 4.3 Take Charge Participate Rate

```text
Value >= 50%
→ 达成

Value < 50%
→ 未达成
```

- 展示精度：0 位小数。
- 百分比值使用 0–100。
- Value 缺失时的显示与业务结果：TBD。

### 4.4 Take Charge Record Open / Closed

- `ClosedWithAction`、`ClosedWithoutAction`、`Declined` 归类为 Closed。
- 其它任意 Take Charge `Status` 归类为 Open。
- 分类由集中业务规则维护；Take Charge Close Rate 仍由数据源直接提供，不从明细重算。

## 5. Risk & Compliance → Events

### 5.1 Event Type

规范值：

- `Agency`：政府检查
- `Non-Agency Event`：非政府检查事件

`Agency` 在内部业务中固定表示政府检查。原文件中的 `Non-Agency` 统一规范为 `Non-Agency Event`。

### 5.2 Open / All

- 默认视图：Open。
- All：不过滤关闭状态。
- `Status = "Closed"` 时归类为 Closed。
- 其它任意 `Status` 值均归类为 Open。
- 页面保留原始 `Status`，不得覆盖或自行维护 Open 状态列表。

页面不得复制 Actions 的状态映射，也不得通过其它字段猜测。

## 6. Risk & Compliance → Actions

Source Status 由数据源提供，不由前端生成。

| Source Status | Open 分类 |
|---|---|
| Assigned | 未关闭 |
| InProgress | 未关闭 |
| Closed | 已关闭 |
| Cancelled | 不属于未关闭 |
| 其它值 | TBD |

- 默认视图：Open。
- All：显示全部源状态。
- 不根据 Due Date 派生 Overdue，除非后续另行确认。
- Action Closure Rate 不由上述明细重算。

## 7. Risk & Compliance → Certificates

### 7.1 输入与输出

- 输入：Certificate Record、Certificate Category、Required Slot、Expiry Date 及 Slot 匹配规则。
- Display Status：无、异常、正常。
- Business Result：异常、正常。
- 数据源不直接提供最终证件汇总状态。

### 7.2 判定顺序

```text
1. 该 Store × Certificate Category 是否存在任何证件记录？
   否 → Display Status = 无；Business Result = 异常
   是 → 进入 Required Slot 匹配

2. 是否存在未满足的 Required Slot？
   是 → Display Status = 异常；Business Result = 异常

3. 该类别内任一相关证件是否已过期？
   是 → Display Status = 异常；Business Result = 异常

4. Required Slot 均满足且相关证件均有效
   → Display Status = 正常；Business Result = 正常
```

### 7.3 边界

- 不设置“即将到期”状态。
- 不提供到期提醒。
- Required Slot 与 Certificate Type 精确匹配如下：

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

- Slot 不使用 Person、Role / Title。
- 一个证件记录只能匹配一个 Slot；匹配不得使用别名或模糊规则。
- 未用于 Slot 匹配的额外证件继续展示，且其过期状态参与整个类别判定。
- Expiry Date 等于比较基准日时是否有效：TBD。
- 缺少 Expiry Date 时如何判定：TBD。

## 8. Risk & Compliance → Environment

### 8.1 危废与一般固废合同组合判定

判定对象：同一 Store 的 Hazardous Waste Contract 与 General Solid Waste Contract。

```text
缺少任一合同类别
→ 异常

任一相关合同已过期
→ 异常

两类合同均存在，且所有相关合同均有效
→ 正常
```

- 多份合同中哪些属于“相关合同”：TBD。
- 组合结果如何映射到两个独立 Environment Category 单元格：TBD。
- Expiry Date 缺失或合同重复时如何处理：TBD。

### 8.2 Car Wash / Drainage Permit

```text
Has Car Wash = No
→ 正常

Has Car Wash = Yes 且 Has Drainage Permit = No
→ 异常

Has Car Wash = Yes 且 Has Drainage Permit = Yes 且许可已过期
→ 异常

Has Car Wash = Yes 且 Has Drainage Permit = Yes 且许可有效
→ 正常
```

任一布尔值或 Permit Expiry Date 缺失时如何处理：TBD。

### 8.3 EIA

```text
EIA Required = No
→ 正常

EIA Required = Yes 且无 EIA Information
→ 异常

EIA Required = Yes 且有 EIA Information
→ 正常
```

- EIA 不进行有效期判断。
- EIA Required 缺失时如何处理：TBD。
- “存在 EIA Information”的最小有效内容：TBD。

### 8.4 Discharge Permit

```text
Discharge Permit Required = No
→ 正常

Discharge Permit Required = Yes 且无 Permit Information
→ 异常

Discharge Permit Required = Yes 且许可已过期
→ 异常

Discharge Permit Required = Yes 且许可有效
→ 正常
```

- Required、Permit Information 或 Expiry Date 缺失时如何处理：TBD。

### 8.5 Environmental Monitoring

```text
当前筛选范围内没有记录
→ Display Status = 无

存在记录
→ Display Status = 查看
```

以下业务规则尚未确认：

- 监测结果是否达标以及如何判定：TBD
- 监测周期、频次与应有记录集合：TBD

Display Status“无”仅表示没有记录，不映射为正常或异常。Environmental Monitoring 不因记录存在性输出正常/异常 Business Result。
