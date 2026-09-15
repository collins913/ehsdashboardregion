# Data Architecture

- 版本：V1（整理版）
- 日期：2026-09-10

## 分层原则

```text
Source data
→ Store Mapping / Resolution
→ Server Repository / normalized logical data
→ Centralized business rules
→ Page-ready results
→ UI
```

- UI 仅通过 repository 抽象访问数据。
- 页面和业务组件不得自行匹配门店、补造缺失数据或执行业务判定。
- 数据源直接提供的汇总值不得由 Dashboard 根据明细重算。
- Source Status、Display Status、Business Result 必须分层。
- 逻辑字段与对象见 `data-contract.md`；它们不是数据库或 API 物理 Schema。

正式页面的数据访问链为：

```text
Client Feature
→ serializable async query
→ Server Action boundary
→ server-only Repository factory
→ Source Adapter / Mock Repository
→ normalized result
→ Client Feature
```

Client 不创建 Repository、不读取 Mock。Public Repository 仅暴露按领域组织的 normalized async query；raw source access 留在 Adapter / Repository implementation 内部。当前 server-only factory 在 Mock Source / Dataset 层选择 Standard 或 Performance profile，未来 Production Adapter 在同一边界替换，不改变 Feature query contract。

Mock Profile 数据流为：

```text
Standard Dataset ─────┐
                     ├→ same Mock Repository → normalized contracts → Feature / UI
Performance Dataset ──┘
```

`EHS_MOCK_PROFILE` 未设置或为空时固定使用 Standard；`standard` 与 `performance` 之外的非空值立即失败。Profile 只决定 server-only raw dataset，不进入 Repository public contract、Server Action query、Feature 或 UI。Performance dataset 按 reference month 延迟生成并在 server process 内复用；Standard dataset 行为保持不变。Production 是未来独立 Repository implementation，不属于 Mock Profile。

Performance Dataset 在相同 reference month 下保持 deterministic，用于独立规模测试与人工验收；日常单元测试默认使用 Standard。规模测试验证当前 Mock 链路，不代表 Production 容量或响应时间承诺。

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

TRTID 不保证是所有数据源的唯一关联键。Events、Actions 与 Environment V1 使用同一已确认源级策略：TRTID 精确唯一匹配优先，失败时使用 Store English Name 精确唯一匹配；TRTID 唯一有效而英文名无匹配时接受 TRTID，以兼容历史改名；英文名明确匹配另一门店时返回冲突。无法唯一解析时返回不完整数据，不静默选择。其它数据源策略仍为 TBD。

页面与 KPI 组装层只消费规范化 `storeId`。源数据中的 TRTID、Store Name CN、Store Name EN 必须由 Adapter / Repository 解析为 `storeId`；当前 mock Repository 仅使用现有精确匹配，无法唯一匹配时将数据标记为不完整，不推测生产匹配策略。

## KPI 数据组装

```text
EhsFilterContext
→ Repository scoped snapshot
→ KPI View Model Builder
→ Centralized Rule Engine
→ KpiRow[]
```

- `EhsFilterContext` 显式提供 `[startInclusive, endExclusive)` 与 `includedMonths`；时间戳必须包含 `Z` 或 UTC offset，契约不一致时 Repository 安全降级为 `INCOMPLETE`。
- Repository 返回带 `AVAILABLE`、`CONFIRMED_EMPTY`、`INCOMPLETE` 或 `UNAVAILABLE` 的数据集。
- 只有数据源或 fixture 明确保证请求范围完整时，零记录才可表示 `CONFIRMED_EMPTY`。
- `Store = ALL` 的覆盖校验使用 Region / Area / Store 范围内实际门店 ID，不以空集合跳过校验。
- Builder 只分组规范化输入并调用现有规则，不实现第二套业务判定。
- Action Closure Rate 必须由 Repository 提供与请求 Period 对应的汇总值，不计算、不平均。
- KPI 初始汇总查询不携带 Action 明细。用户打开 Action 下钻后，再复用 Actions Repository 的规范化 `OPEN_ONLY` 查询，按 Region / Area / Store 及 Submitted Date Period 获取目标门店明细。Store Resolution、Status 解析、RecordState 和 OPEN 过滤仍只由 Repository 执行。
- KPI feature 读取 Dashboard 共享 Filter Context，经 Server Action 调用 Repository 与 Builder；Client 不读取 mock、不创建 Repository、不执行业务计算。
- Dashboard 每次运行只生成一个 `referenceDate`，Global Filters 和 mock Repository 共同使用该值；`createKpiMockData(referenceDate)` 以 `Asia/Shanghai` 当前月为界，同时生成当年 1 月至当前月的 KPI fixture 与 coverage。
- Mock Repository 只在请求 Store × Period 落入已声明 source coverage 时确认数据完整；完整范围内没有业务记录是有效空集，不等同于 `INCOMPLETE`。
- Mock Action Closure Rate 使用显式 `[startInclusive, endExclusive)` 标识源汇总周期；每个值均为源 fixture 直接提供，不从月度值或 Action 明细计算。

## Goals / Take Charge scoped queries

```text
Raw Take Charge (TRTID only)
→ existing Store Resolution
→ NormalizedTakeChargeRecord
→ store-month totalCount / closedCount aggregate
→ scoped Goals summary
→ Repository-paginated Take Charge table
```

- 提交总数与关闭率按 Submitted At 使用 Global Period；关闭率先汇总月度分子与分母，再计算百分比。
- 今年平均提交数与今年参与率由年度组织范围 aggregate 提供，不读取 Global Period，也不平均门店最终指标。
- Take Charge 明细查询在 Repository 边界接收 view mode、sorting、`pageIndex / pageSize` 并返回 `totalCount`；Repository 对完整 scoped result 先过滤、排序，再分页。视图和排序不影响 Goals summary。
- 动态扩展字段只能由字段定义驱动，默认隐藏，不能覆盖核心字段或直接暴露 raw object。

## Actions scoped query

```text
Raw Action
→ Store Reference Resolution
→ ParsedActionStatus / RecordState
→ Region / Area / canonical Store / Submitted Date filtering
→ OPEN_ONLY or ALL
→ NormalizedActionRecord[]
→ Actions feature UI / KPI Actions drill-down
```

- Actions 页面复用 Dashboard 的 `EhsFilterContext`，Period 只解释为 Submitted Date 的 Asia/Shanghai 半开区间。
- Repository 输出 canonical `storeId`、中文门店名、原始状态解析结果与 RecordState；UI 不读取 Store Reference，也不解析状态。
- `OPEN_ONLY` 与 `ALL` 是 Actions feature view state，不进入 Global Filter Context。
- KPI Action 下钻与 Actions 页面 Open 视图复用同一查询；相同 Filter Context 下必须返回相同 OPEN Action ID。Actions 页面 All 视图仅改变 view mode，不改变 Store 或 Period 解释。
- Actions query 对完整 scoped result 依次执行 Period、view mode、sorting、pagination，并返回当前页、`totalCount` 与 availability。

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

此处 `Event Date` 指稳定的 source / contract 字段；用户可见术语为 `Event Time` / “事件时间”。

- Event Type 选项从当前 Global Filter + view mode 的未按 type 过滤结果生成，避免选中后其它选项消失。
- Events query 在分页前生成 `availableEventTypes`，并对完整 scoped result 先过滤、排序、再分页。
- KPI ASTM 输入与 Events 页面复用同一 normalized Event Repository 数据；ASTM 规则仍只读取 `ASTMInjuryIllness`，不在页面重算。
- 完整 coverage 下空结果为 `CONFIRMED_EMPTY`；超出 coverage 或 Store Resolution 不完整时为 `INCOMPLETE`。

## Global Filters

- Dashboard route layout 持有一份共享筛选状态，页面切换时不重置。
- Region、Area、Store 沿用 `EhsFilterContext` 的 `ALL` / `INCLUDE` 契约；Store 仅保存 Repository 输出的 canonical `storeId`。
- Repository 向筛选 UI 提供 `storeId`、`displayName`、Region、Area，不允许 UI 使用名称或 TRTID 自行关联。
- Period V1 仅生成 Asia/Shanghai 时区下的完整自然月范围，统一输出 `[startInclusive, endExclusive)` 与连续 `includedMonths`。
- 当前未结束月份的业务完整性仍由既有 DataAvailability 机制表达；Global Filters 不增加 KPI 判定规则。

## Environment V1 current-state query

```text
Environment Raw Source (TRTID / English Store Name + six current values)
→ existing Mock Dataset / Source boundary
→ existing Store Resolution / same EHS Repository
→ normalized Environment result
→ Server Action boundary
→ Environment Feature / Table / shared Detail Sheet
```

六个源值只表达“有 / 无 / 不适用”，不进入 Rule Engine。Region / Area / canonical Store 有效，Period 忽略。中文名称来自 Store Master，Raw 不携带中文名；Detail 只展示门店、项目、当前值，其余字段 TBD。

Environment 采用现有轻量 master 表格模式，对 scoped normalized result 进行 Client sorting / pagination，不创建独立 Repository runtime 或 Table / Detail framework。Mock 使用既有 Store Master 生成少量 deterministic 当前状态记录；不扩展 Performance V1 规模目标，未覆盖门店明确返回不完整数据。

## Store Master Data

```text
Store Master source
→ scoped Stores Repository query
→ Stores feature
→ Table / Store Detail
```

Repository 直接按 Global Region / Area / canonical Store 过滤 Store Master；Store Master 本身不经过 Store Resolution。列表默认显示 Store Name CN、Region、Area、TRTID、Manager、EHS&S 代表，Store Name EN 在 Detail 中展示。

Period 不参与 Store Master Data 的筛选、判断或计算。字段类型、约束、来源和物理存储仍为 TBD。

## 未决技术边界

- 数据库、表名、物理字段、主外键、索引与唯一约束
- API 路由、请求、响应与错误结构
- 数据源系统、刷新频率与持久化方式
- 权限模型
- 生产环境 `referenceDate` 来源与 clock injection 策略；业务时区已冻结为 `Asia/Shanghai`

## 当前测试数据实现

- 领域类型：`src/types/ehs.ts`
- Mock 数据与 Standard / Performance Dataset Profile：`src/data/mock/`
- 数据访问接口与 mock 实现：`src/data/repositories/`
- 集中状态及证件规则：`src/lib/rules/`
- KPI 中立查询/数据契约：`src/data/contracts/kpi.ts`
- Actions 规范化查询契约：`src/data/contracts/actions.ts`
- Events 规范化查询契约：`src/data/contracts/events.ts`
- Take Charge / Goals 规范化查询契约：`src/data/contracts/take-charge.ts`
- Stores 规范化查询契约：`src/data/contracts/stores.ts`
- Environment 当前状态规范化查询契约：`src/data/contracts/environment.ts`
- KPI View Model 与组装：`src/features/kpi/`
- 当前自然年 1 月至 `referenceDate` 当前月的 KPI Mock factory（不生成未来月份）：`src/data/mock/kpi-mock-factory.ts`
- Mock KPI 完整性声明：`src/data/mock/kpi-coverage.ts`，由 factory 与数据同步生成

页面不得直接导入 `src/data/mock/`。当前统一从 repository 入口访问；未来替换 API 或数据库实现时保持 repository 接口稳定。
