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

TRTID 不保证是所有数据源的唯一关联键。除 Actions 外，各数据源的匹配字段、优先级、名称规范化、冲突、重复命中与未命中处理均为 TBD。Actions 使用已确认的源级策略：TRTID 精确唯一匹配优先，失败时使用 Store English Name 精确唯一匹配；两者冲突或无法唯一解析时返回不完整数据，不静默选择。

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
- KPI Action 明细复用 Actions Repository 的规范化 `OPEN_ONLY` 查询，按 Region / Area / Store 及 Submitted Date Period 过滤。Store Resolution、Status 解析、RecordState 和 OPEN 过滤只在 Repository 链中执行一次；Builder 只按门店分配结果。
- 当前 mock 阶段由 KPI feature client component 读取 Dashboard 共享 Filter Context，再调用 Repository 与 Builder；页面本身不读取 mock、不组装筛选参数、不执行业务计算。
- Dashboard 每次运行只生成一个 `referenceDate`，Global Filters 和 mock Repository 共同使用该值；`createKpiMockData(referenceDate)` 以 `Asia/Shanghai` 当前月为界，同时生成当年 1 月至当前月的 KPI fixture 与 coverage。
- Mock Repository 只在请求 Store × Period 落入已声明 source coverage 时确认数据完整；完整范围内没有业务记录是有效空集，不等同于 `INCOMPLETE`。
- Mock Action Closure Rate 使用显式 `[startInclusive, endExclusive)` 标识源汇总周期；每个值均为源 fixture 直接提供，不从月度值或 Action 明细计算。

## Actions scoped query

```text
Raw Action
→ Action Store Resolution
→ ParsedActionStatus / RecordState
→ Region / Area / canonical Store / Submitted Date filtering
→ OPEN_ONLY or ALL
→ NormalizedActionRecord[]
→ Actions feature UI / KPI Actions drill-down
```

- Actions 页面复用 Dashboard 的 `KpiFilterContext`，Period 只解释为 Submitted Date 的 Asia/Shanghai 半开区间。
- Repository 输出 canonical `storeId`、中文门店名、原始状态解析结果与 RecordState；UI 不读取 Store Reference，也不解析状态。
- `OPEN_ONLY` 与 `ALL` 是 Actions feature view state，不进入 Global Filter Context。
- KPI Action 下钻与 Actions 页面 Open 视图复用同一查询；相同 Filter Context 下必须返回相同 OPEN Action ID。Actions 页面 All 视图仅改变 view mode，不改变 Store 或 Period 解释。

## Events scoped query

```text
Raw Event
→ existing Store Resolution
→ Event Status / RecordState
→ Region / Area / canonical Store / Event Date filtering
→ OPEN_ONLY or ALL
→ optional source Event Type filtering
→ NormalizedEventRecord[]
→ Events feature UI / future ASTM drill-down
```

- Event Type 选项从当前 Global Filter + view mode 的未按 type 过滤结果生成，避免选中后其它选项消失。
- KPI ASTM 输入与 Events 页面复用同一 normalized Event Repository 数据；ASTM 规则仍只读取 `ASTMInjuryIllness`，不在页面重算。
- 完整 coverage 下空结果为 `CONFIRMED_EMPTY`；超出 coverage 或 Store Resolution 不完整时为 `INCOMPLETE`。

## Global Filters

- Dashboard route layout 持有一份共享筛选状态，页面切换时不重置。
- Region、Area、Store 沿用 `KpiFilterContext` 的 `ALL` / `INCLUDE` 契约；Store 仅保存 Repository 输出的 canonical `storeId`。
- Repository 向筛选 UI 提供 `storeId`、`displayName`、Region、Area，不允许 UI 使用名称或 TRTID 自行关联。
- Period V1 仅生成 Asia/Shanghai 时区下的完整自然月范围，统一输出 `[startInclusive, endExclusive)` 与连续 `includedMonths`。
- 当前未结束月份的业务完整性仍由既有 DataAvailability 机制表达；Global Filters 不增加 KPI 判定规则。

## Store Master Data

默认显示：Region、Area、Store Name CN、Store Name EN、TRTID、Manager、EHS Ambassador。

Period 不参与 Store Master Data 的筛选、判断或计算。字段类型、约束、来源和物理存储仍为 TBD。

## 未决技术边界

- 数据库、表名、物理字段、主外键、索引与唯一约束
- API 路由、请求、响应与错误结构
- 数据源系统、刷新频率与持久化方式
- 权限模型
- 生产环境 `referenceDate` 来源与 clock injection 策略；业务时区已冻结为 `Asia/Shanghai`

## 当前测试数据实现

- 领域类型：`src/types/ehs.ts`
- Mock 数据：`src/data/mock/`
- 数据访问接口与 mock 实现：`src/data/repositories/`
- 集中状态及证件规则：`src/lib/rules/`
- KPI 中立查询/数据契约：`src/data/contracts/kpi.ts`
- Actions 规范化查询契约：`src/data/contracts/actions.ts`
- Events 规范化查询契约：`src/data/contracts/events.ts`
- KPI View Model 与组装：`src/features/kpi/`
- 当前自然年 1 月至 `referenceDate` 当前月的 KPI Mock factory（不生成未来月份）：`src/data/mock/kpi-mock-factory.ts`
- Mock KPI 完整性声明：`src/data/mock/kpi-coverage.ts`，由 factory 与数据同步生成

页面不得直接导入 `src/data/mock/`。当前统一从 repository 入口访问；未来替换 API 或数据库实现时保持 repository 接口稳定。
