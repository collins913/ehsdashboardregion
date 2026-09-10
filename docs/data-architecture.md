# Data Architecture

- 版本：V1（整理版）
- 日期：2026-09-10

## 分层原则

```text
Source data
→ Store Mapping / Resolution
→ Repository / normalized logical data
→ Centralized business rules
→ Page-ready results
→ UI
```

- UI 仅通过 repository 抽象访问数据。
- 页面和业务组件不得自行匹配门店、补造缺失数据或执行业务判定。
- 数据源直接提供的汇总值不得由 Dashboard 根据明细重算。
- Source Status、Display Status、Business Result 必须分层。
- 逻辑字段与对象见 `data-contract.md`；它们不是数据库或 API 物理 Schema。

## V1 领域边界

- `Risk & Compliance`：Events、Actions、Certificates、Environment 的底层事实、记录与合规结果。
- `Performance`：基于业务事实或数据源汇总值形成的 KPI 与 Goals。
- `Overview`：未来汇总统一结果，不创建第二套业务事实或算法。
- `Store Detail`：仅核验 Store Master Data，不承载 Performance 或 Risk & Compliance 内容。

## Store Resolution

业务数据必须先解析到统一 Store，再进入规则计算。

候选匹配信息：

- TRTID
- Store Name CN
- Store Name EN

TRTID 不保证是所有数据源的唯一关联键。各数据源的匹配字段、优先级、名称规范化、冲突、重复命中与未命中处理均为 TBD。

页面与 KPI 组装层只消费规范化 `storeId`。源数据中的 TRTID、Store Name CN、Store Name EN 必须由 Adapter / Repository 解析为 `storeId`；当前 mock Repository 仅使用现有精确匹配，无法唯一匹配时将数据标记为不完整，不推测生产匹配策略。

## KPI 数据组装

```text
KpiFilterContext
→ Repository scoped snapshot
→ KPI View Model Builder
→ Centralized Rule Engine
→ KpiRow[]
```

- `KpiFilterContext` 显式提供 `[startInclusive, endExclusive)` 与 `includedMonths`；时间戳必须包含 `Z` 或 UTC offset，契约不一致时 Repository 安全降级为 `INCOMPLETE`。
- Repository 返回带 `AVAILABLE`、`CONFIRMED_EMPTY`、`INCOMPLETE` 或 `UNAVAILABLE` 的数据集。
- 只有数据源或 fixture 明确保证请求范围完整时，零记录才可表示 `CONFIRMED_EMPTY`。
- `Store = ALL` 的覆盖校验使用 Region / Area / Store 范围内实际门店 ID，不以空集合跳过校验。
- Builder 只分组规范化输入并调用现有规则，不实现第二套业务判定。
- Action Closure Rate 必须由 Repository 提供与请求 Period 对应的汇总值，不计算、不平均。
- KPI Action 明细仅保留规则层归类为 `OPEN` 的记录。

## Store Master Data

默认显示：Region、Area、Store Name CN、Store Name EN、TRTID、Manager、EHS Ambassador。

Period 不参与 Store Master Data 的筛选、判断或计算。字段类型、约束、来源和物理存储仍为 TBD。

## 未决技术边界

- 数据库、表名、物理字段、主外键、索引与唯一约束
- API 路由、请求、响应与错误结构
- 数据源系统、刷新频率与持久化方式
- 权限模型
- 生产业务时区与部分月份政策

## 当前测试数据实现

- 领域类型：`src/types/ehs.ts`
- Mock 数据：`src/data/mock/`
- 数据访问接口与 mock 实现：`src/data/repositories/`
- 集中状态及证件规则：`src/lib/rules/`
- KPI 中立查询/数据契约：`src/data/contracts/kpi.ts`
- KPI View Model 与组装：`src/features/kpi/`
- Mock KPI 完整性声明：`src/data/mock/kpi-coverage.ts`

页面不得直接导入 `src/data/mock/`。当前统一从 repository 入口访问；未来替换 API 或数据库实现时保持 repository 接口稳定。
