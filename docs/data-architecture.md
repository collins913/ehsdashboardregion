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
→ runtime query input validation
→ verified identity / Effective Access / authorized scope
→ server-only Repository factory
→ Source Adapter / Mock Repository
→ normalized result
→ Client Feature
```

Client 不创建 Repository、不读取 Mock。Public Repository 仅暴露按领域组织的 normalized async query；raw source access 留在 Adapter / Repository implementation 内部。当前 server-only factory 在 Mock Source / Dataset 层选择 Standard 或 Performance profile，未来 Production Adapter 在同一边界替换，不改变 Feature query contract。

受保护业务数据必须经过服务端身份解析、Effective Access、请求范围授权，再由 Repository 查询并返回授权后的 DTO。Client 不直接读取 protected production source / JSON，也不持有其 URL 或凭据；不能先返回全量数据再由 React 过滤。授权同样覆盖 `totalCount`、summary 与筛选选项。当前 Next.js Server Action 使用集中 `authorizeBusinessScope` adapter；未来 Production Repository 仍位于该 server boundary 之后。SharePoint Document Library JSON 只是可能的数据源实现，不是 Client API。

Server Action 的 TypeScript DTO 不作为 runtime validation。只读查询入口在授权和 Repository 调用前验证 payload 的结构、基础类型、枚举、排序 key、分页整数及 ISO / Period 合法性；非法输入拒绝为稳定的 `INVALID_QUERY_INPUT` 错误，不能降级成默认筛选或日期。Scope 是否可访问仍由 Effective Access / `authorizeBusinessScope` 判断。

只读 Server Action 通过 `QueryOutcome<T>` 返回安全错误码，UI 不依赖 production 会隐藏的异常消息。共享 `useLatestAsyncQuery` 处理分类并维持 requested/resolved 身份；身份或权限失败会清除旧结果。KPI 明细的 `storeId` 同样必须属于授权后的 Store 集合，校验在 Repository 初始化前完成。Area 筛选、授权和 Repository 共用 `areaScopeId(region, area)`，跨区域同名小区不得合并。

Access Service 从 Store / Organization source 派生 Base Grants、读取独立 Manual Grant Repository 并解析 Effective Access；Manual Grant 存在即生效，删除即失效。`EHS_MOCK_USER_EMAIL` 仅在 server-only Mock identity resolver 使用，未配置时落到预置全局管理员；Production Identity Provider 后续替换它。Manual Grant 与审计由同一 Repository mutation 维护；Production 实现应原子写入两者。/access 的两个 Tab 只管理手动权限与呈现审计；UI 只展示 DTO、收集输入并触发 Server Action，Region / Area / Store 查询忽略 Period。

Access 写入遵循 Server Action → runtime parse / validate → Access Service → Repository。Service 校验目录范围与最后一名有效 GLOBAL_ADMIN；Client 只显示结果。当前 Mock Repository 为进程内状态；Production 须在持久化事务中原子执行最后管理员检查、Grant mutation 与 Audit 写入，以防并发操作绕过保护。

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
- Store Name EN（optional fallback）

所有业务域使用同一 Store Resolution：TRTID 精确唯一匹配优先；缺失或无法唯一解析时使用 Store English Name 精确唯一 fallback。TRTID 唯一有效而英文名无匹配时接受 TRTID，以兼容历史改名；英文名明确匹配另一门店时返回冲突。Store Name CN 只用于展示，不参与关联。无法唯一解析时返回不完整数据，不静默选择。

页面与 KPI 组装层只消费规范化 `storeId`。源数据中的 TRTID 与可选 Store Name EN 由 Adapter / Repository 解析为 `storeId`；Store Name CN 仅用于展示，不参与关联。当前 Mock Repository 在无法唯一匹配时将数据标记为不完整。

## KPI 数据组装

```text
EhsFilterContext
→ Repository scoped snapshot
→ normalized Store × Period sources
→ centralized KpiDomainResult
→ KPI presentation builder / ScoreContribution producer
→ KpiPageResult (KpiRow[] + query availability) / Overview pooled aggregation
```

- `EhsFilterContext` 显式提供 `[startInclusive, endExclusive)` 与 `includedMonths`；时间戳必须包含 `Z` 或 UTC offset，契约不一致时 Repository 安全降级为 `INCOMPLETE`。
- Repository 返回带 `AVAILABLE`、`CONFIRMED_EMPTY`、`INCOMPLETE` 或 `UNAVAILABLE` 的数据集。
- 只有数据源或 fixture 明确保证请求范围完整时，零记录才可表示 `CONFIRMED_EMPTY`。
- `Store = ALL` 的覆盖校验使用 Region / Area / Store 范围内实际门店 ID，不以空集合跳过校验。
- `src/lib/rules/kpi-domain.ts` 统一评价五项 KPI；snapshot 必须携带 `domainResults`。`buildKpiRows` 只映射结果，不调用规则。Training / Inspection 共用注入的 required-set provider，不再保留 KPI 与 Overview 两套解释。
- Server Action 返回 `KpiPageResult`，同时保留门店行与查询级 source availability。无法关联门店的记录只触发查询级不完整提示，不覆盖有效门店的 Domain Result；没有行时也不能丢失该提示。Client 只展示服务端提供的 availability。
- Action Closure Rate 必须由 Repository 提供与请求 Period 对应的汇总值，不计算、不平均。
- KPI 初始汇总查询不携带 Action 明细。用户打开 Action 下钻后，再复用 Actions Repository 的规范化 `OPEN_ONLY` 查询，按 Region / Area / Store 及 Submitted Date Period 获取目标门店明细。Store Resolution、Status 解析、RecordState 和 OPEN 过滤仍只由 Repository 执行。
- KPI feature 读取 Dashboard 共享 Filter Context，经 Server Action 调用 Repository 与 Builder；Client 不读取 mock、不创建 Repository、不执行业务计算。
- Dashboard 每次运行只生成一个 `referenceDate`，Global Filters 和 mock Repository 共同使用该值；`createKpiMockData(referenceDate)` 以 `Asia/Shanghai` 当前月为界，同时生成当年 1 月至当前月的 KPI fixture 与 coverage。
- Mock Repository 只在请求 Store × Period 落入已声明 source coverage 时确认数据完整；完整范围内没有业务记录是有效空集，不等同于 `INCOMPLETE`。
- Mock Action Closure Rate 使用显式 `[startInclusive, endExclusive)` 标识源汇总周期；每个值均为源 fixture 直接提供，不从月度值或 Action 明细计算。

## Overview score calculation boundary

Overview scoring follows the existing server-side direction:

```text
Domain Repository / normalized result
→ Domain Rule / Achievement Result
→ per-Store × Metric × Month ScoreContribution
→ Overview pooled aggregation and view model
→ UI
```

Overview does not read raw source, call repositories from React, or reinterpret domain outcomes. Each V1 metric contributes one available point per Store and month; source or rule failures remain zero-point contributions with explicit diagnostic reasons. Store, Area, and Region aggregate by summing earned and available points before calculating scoreRate. All Stores remain eligible for ranking; completeness is not an Overview score or ranking gate.

The contribution DTO and complete V1 metric mapping are defined in `data-contract.md` and `metric-rules.md`. The formal `/overview` route now uses `EhsRepository.getOverviewScoreData` → `ScoreContribution` → server-side `prepareOverviewResult` → typed `OverviewResult`. React receives prepared history, ranking, matrix, dimension, store-list, and detail data; it does not score, aggregate, sort business rankings, or fill historical months. Standard and Performance profiles use the same repository, domain rules, contribution producer, and aggregation path. `src/lib/rules/overview-production.ts` prepares one month at a time through typed Domain Readers; it depends on domain contracts, never on Mock fixtures, a Repository implementation, or a Feature builder. It maps authoritative results and reasons to points without reevaluating domain rules. The view model indexes contributions by Store × Month before aggregation. A new domain metric registers a domain-owned result-to-contribution mapping; the pooled aggregation remains unchanged. Environment is not scored in V1, but can later produce an Environment contribution through the same boundary. Prototype files remain separate and are not imported by the formal route.

Training and Inspection requirement membership comes from an injected `OverviewRequiredSetProvider`, not observed records. Standard and Performance use the same Mock V1 provider and source generators. Production replaces that provider with authoritative Store × Month requirement sources; ScoreContribution and Overview aggregation remain unchanged. An absent runtime set remains a diagnostic 0/1 contribution.

## Architecture Hardening V1

- KPI / Event / Inspection / Action source normalization and Store × Month indexes are prepared once per immutable Dataset instance. Action Closure Rate source aggregates use exact parsed Period keys. Certificate identity/category normalization is also reused; expiry evaluation still uses each injected referenceDate.
- Coverage bounds, month sets and Store membership are prepared outside scoring loops. Query Period is validated once per domain reader; reference dates are computed once per month. The Shanghai formatter is module-scoped. No contribution/result cache was added.
- Store × metric × known period owns source diagnostics; Dataset-level availability is a query summary and never overwrites another Store's Domain Result or contribution. Conflicting identity rows remain rejected; an identifiable primary TRTID owns their diagnostic rather than contaminating the English-name target.
- If a date cannot establish Period membership, its defect remains limited to that Store/domain but conservatively affects its requested periods. If no Store can be identified, the orphan remains a query-level incomplete-source diagnostic and is not assigned to arbitrary Stores. Production must provide authoritative source scope/coverage to resolve these cases; no fabricated date, Store or historical fact is introduced.
- `goal-domain.ts` evaluates normalized Goal inputs; the Mock annual adapter alone knows fixture numerator/denominator fields and pools them before division. Consumers share Goal Results with independent metric reasons. Certificate category Results include their reason; Overview never reconstructs it from records.
- Client boundary tests follow runtime imports and re-exports through helpers/hooks, stopping at Server Action proxies. Domain calculators and server presentation builders must remain outside that dependency graph; DTO types, static display metadata, natural-month query construction and chart/layout arithmetic retain their existing presentation roles.

## Goals / Take Charge scoped queries

```text
Raw Take Charge (TRTID + optional English Store Name)
→ existing Store Resolution
→ NormalizedTakeChargeRecord
→ store-month totalCount / closedCount aggregate
→ scoped Goals summary
→ Repository-paginated Take Charge table
```

- 提交总数与关闭率按 Submitted At 使用 Global Period；关闭率先汇总月度分子与分母，再计算百分比。
- 无法关联门店的 Take Charge 记录在可能涉及的 Period 保留查询级不完整诊断；Goals 周期汇总与明细保持一致，提交数、关闭数和关闭率返回 null，结果为 UNDETERMINED。该诊断不改变有效门店的 Overview contribution 或独立年度源汇总。
- 今年人均提交数与今年参与率由年度组织范围 aggregate 提供，不读取 Global Period，也不平均门店最终指标。
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
- 同一筛选状态派生有效 Store scope 与完整 period-aware context；query readiness / identity 仅依赖实际使用的维度。Overview、Stores、Environment、Certificates 使用无 Period 的 typed scope，经既有 Server Action / Repository 查询。Environment 合同到期数量的统计月份由 Server Action 从 referenceDate 派生，不读取 Global Period。KPI、Goals、Events、Actions 继续使用 Global Period。
- Region、Area、Store 沿用 `EhsFilterContext` 的 `ALL` / `INCLUDE` 契约；Store 仅保存 Repository 输出的 canonical `storeId`。
- Repository 向筛选 UI 提供 `storeId`、`displayName`、Region、Area，不允许 UI 使用名称或 TRTID 自行关联。
- Period V1 仅生成 Asia/Shanghai 时区下的完整自然月范围，统一输出 `[startInclusive, endExclusive)` 与连续 `includedMonths`。
- 当前未结束月份的业务完整性仍由既有 DataAvailability 机制表达；Global Filters 不增加 KPI 判定规则。

## Environment detail query

```text
Environment Raw Source (TRTID / English Store Name + typed detail fields)
→ existing Mock Dataset / Source boundary
→ existing Store Resolution / same EHS Repository
→ normalized Environment result
→ Server Action boundary
→ Environment Feature / Table / shared Detail Sheet
```

## Production API V1 and Enterprise Access V1

Production and Mock are separate server-only modes. `EHS_DATA_SOURCE=production` selects the Production Repository seam; missing production configuration throws and never falls back to Mock. In non-production development/test, absent mode keeps the existing Mock profile path. `EHS_MOCK_PROFILE` remains limited to Standard / Performance.

Production query implementations compose the existing `EhsRepository` domain interfaces. The database-neutral `ProductionStorageAdapter` reads only published source batches and owns transactional staging/publish operations. Its actual enterprise adapter is not configured in this repository. The test-only memory implementation is located under `src/data/server/testing/` and must not be imported by production routes.

The import API is Contract First at `docs/api/production-api-v1.yaml`; route handlers are `/api/v1/import/batches`, `/api/v1/import/batches/{batchId}`, `/validate`, and `/publish`. Identity is verified before resolving the protected Import Service; submit requests are also checked for Domain scope before runtime initialization. They return `PRODUCTION_IMPORT_NOT_CONFIGURED` until the machine identity verifier and persistent import adapter are supplied. `COMPLETE` is only an uploader declaration; publication requires an independently verified proof and records `VERIFIED_COMPLETE`. A configured proof verifier is not installed here, so the current default fails closed. The persistent adapter must implement revision/state compare-and-swap for validation and publication, persist creator/operator audit, and atomically replace only the declared scope, active pointer and batch state in one transaction. Validation cannot overwrite `PUBLISHED`; stale revisions conflict; a repeated publish of the same published batch is idempotent. The database adapter must preserve the prior publication and audit atomicity on failure.

Import HTTP responses expose batch metadata, state, coverage assessment, audit and diagnostics only; staged source records are not returned by submit, status, validate or publish responses. Validation still reads them through the protected persistence/service boundary.

`GLIFE_CONTEXT` is accepted only by the client-side display profile adapter after exact parent-origin and `window.parent` source checks. `publicMediaToken` is discarded. This browser value is never used by `authorizeBusinessScope`. Protected Server Actions resolve a server-trusted principal; Production without a configured `ServerIdentityProvider` fails closed. Production Access requires a company-provided Store/organization and persistent `AccessRepository` runtime. The provider must verify the principal and supply a verified email because the existing Access Domain is email-keyed; stable `principalId` is retained for bootstrap and audit integration, but grant-key migration is not implemented.

`/api/v1/access/bootstrap` checks the trusted stable principal against `EHS_BOOTSTRAP_PRINCIPAL_ID` before resolving the bootstrap store; the configured persistence transaction must atomically create the first administrator grant and its audit/bootstrap record. No bootstrap store is configured by default. Machine import identity is separate and must authorize specific domains; it confers no Dashboard user or administrator rights. Production Access persistence must atomically write each grant mutation and audit event and enforce the last-effective-admin invariant inside the same database transaction; service preflight checks alone are insufficient.

Status boundary: API routes, DTO validation, lifecycle service, adapter interfaces, GLIFE display adapter, server identity seam, and test doubles are implemented. Enterprise database, persistent transaction adapter, trusted SSO verification, M2M credentials, access persistence and initial-admin storage remain integration-required. Take Charge annual logical outputs and targets are frozen; company physical fields are mapped directly by the Production Repository Adapter, while the generic batch API intentionally rejects that Domain. See `docs/integration/corporate-ai-integration.md` before enabling any production mode.

Environment Detail 不进入 Rule Engine，不产生 Business Result。Region / Area / canonical Store 有效，Period 与 referenceDate 忽略。中文名称来自 Store Master，Raw 不携带中文名；Repository 逐字段规范化环保证照、应急预案、监测及废弃物合同，Feature 仅做五类详情的 presentation routing。Environment Analytics 在 server-side rule 中以当前 scope 全部门店为持有率分母，按每店是否至少有一条对应废弃物合同在 referenceDate 当天有效计分子；有效要求 validTo 为合法 date-only 日期且 validTo >= referenceDate，缺失、无效或过期合同不计入。到期记录数按 normalized 合同记录与 referenceDate 所在自然月计算，不接收 Global Period。设施信息和 Monitoring 新字段保持 TBD。

Environment 采用现有轻量 master 表格模式，对 scoped normalized result 进行 Client sorting / pagination，并复用一个 Detail Sheet；不创建独立 Repository runtime、Table 或 Detail framework。废弃物合同数组保留所有源记录及顺序，不去重、不截断。Standard Mock 使用既有 Store Master 为每家门店生成 deterministic detail record；Performance Profile 为其 500 家 Store 各生成一条 deterministic Environment record。未覆盖门店明确返回不完整数据。

## Certificates V1 current-state query

Raw Certificate → existing Mock Dataset → same EHS Repository / existing Store Resolution → typed normalized records / centralized rules → Store × Category summary → Feature / shared Table / one Detail Sheet。

Detail 的 Type grouping 属于纯 presentation：根据当前类别已规范化 records 形成 typed groups，保持所有同 Type 记录，纵向展示 Type sections / record cards。不硬编码 Type 布局，也不重新计算类别、有效期或状态。

TRTID primary、English Store Name fallback 与 conflict / historical-name 语义沿用现有 resolver。Raw 不携带中文名称或 Category；Type 使用集中 exact mapping，未知 Type 保留独立 normalized records，不猜分类。每张记录和类别仅 NORMAL / ABNORMAL；Period ignored，referenceDate 用于 date-only 有效期与自然日差。UI 不计算规则，不创建独立 Repository、Table、Detail 或通用 Required Slot framework。Certificate Overview 的每店数量配置、完整类型行、分类分组与排序由集中 taxonomy / domain rules 准备，不改变类别状态。未来字段通过显式 typed contract 扩展。Performance Profile 仅提供少量 deterministic shape compatibility。

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
- Production Entra identity（tenantId + objectId）、first-admin bootstrap、Access / Audit 持久化与独立受保护 Backend/API 选型
- SharePoint protected JSON API / secure data access、authorization-aware cache isolation 与 ASPX / SPFx 部署安全验证
- 历史 Snapshot 的 `referenceDate` 冻结与重放策略；当前 Production 查询已使用服务端可信时钟并按 `Asia/Shanghai` 解释

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
- Environment typed detail 查询契约：`src/data/contracts/environment.ts`
- Certificates 单证与门店类别汇总契约：`src/data/contracts/certificates.ts`
- KPI View Model 与组装：`src/features/kpi/`
- 当前自然年 1 月至 `referenceDate` 当前月的 KPI Mock factory（不生成未来月份）：`src/data/mock/kpi-mock-factory.ts`
- Mock KPI 完整性声明：`src/data/mock/kpi-coverage.ts`，由 factory 与数据同步生成

页面不得直接导入 `src/data/mock/`。当前统一从 repository 入口访问；未来替换 API 或数据库实现时保持 repository 接口稳定。

## System Monitoring V1

Monitoring is an independent operational service and persistence port; it does not enter EHS Events, Actions, Domain Rules, ScoreContribution or Overview aggregation. Capture points are the shared client error endpoint / Error Boundaries, `useLatestAsyncQuery`, exported EHS Server Actions, Access Server Actions, Production Import API and configured Job / Notification workers. These boundaries translate only detectable failures and explicit DataAvailability diagnostics; expected authorization / input rejection remains low-severity and normal EHS facts are never reported as system faults.

`MonitoringRepository.recordEvent` is the transaction boundary for Event + Incident aggregation + optional opening/repeat Outbox entries. Production adapters must enforce fingerprint and idempotency uniqueness, atomic incident revision updates, admin state CAS, cross-worker Outbox leasing and result CAS, rate-limit atomicity, and transactional audit writes. Manual `reopenIncident` must atomically require the expected resolved revision, ensure no other active Incident has the fingerprint, restore the active fingerprint mapping, clear resolution/acknowledgement fields, and append the trusted administrator audit. `resolveAfterVerifiedRecovery` must resolve the active Incident and queue its recovery notification atomically. The development/test Memory adapter is not a production fallback. Production runtime currently raises `PRODUCTION_MONITORING_ADAPTER_NOT_CONFIGURED` and emits a redacted structured server diagnostic as best-effort fallback.

In non-production development, the `/monitoring` page seeds two visibly labelled demo Incidents into the in-memory adapter once per process so the list and detail workflow can be previewed. The seed is rejected in production and never runs against a non-memory repository; these records are not source data and must not be used for operational conclusions.

The vendor-neutral Email provider interface and test recording provider are separated from the business capture path. `EHS_MONITORING_ALERT_RECIPIENTS`, optional WARNING routing, bounded retry policy and `EHS_MONITORING_JOBS` are deployment configuration seams, not real enterprise integrations. The company scheduler calls the watchdog and Outbox worker; the repository does not create schedules. `/monitoring` is a GLOBAL_ADMIN-only route with an independent time-range filter and uses the shared DataTable / Sheet / Select / Switch / Sonner primitives.
