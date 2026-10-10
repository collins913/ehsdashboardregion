# EHS Dashboard Development Roadmap

- 更新日期：2026-10-10
- 职责：记录当前进度、后续顺序和阶段依赖；业务规则与架构决策仍以对应专项文档为准。

## 当前阶段

项目已完成基础架构、七个正式业务模块、Overview Data V1、Production Import API V1 接口边界及 System Monitoring V1 应用边界。Training / Inspection 使用合成 Mock V1 集合验证规则；Production authoritative required-set source/config 仍待提供。Prototype 文件保留，但正式路由不依赖 Prototype 数据、评分或历史 fixture。Access Management V1 Demo：completed；当前进入公司 Production Integration 阶段，尚未达到生产部署就绪。

Environment Detail Expansion：completed。主表保持门店维度并提供五个详情入口；typed 环保证照、应急预案与废弃物合同明细已完成，设施信息及 Monitoring 新字段保持 TBD。

Certificates V1：completed，Architecture / Docs audit、完整质量门与人工验收通过；四类别仅展示正常 / 异常，Period ignored，Detail 按 Type 纵向分组并保留全部记录。未来字段与完整性要求另行确认。

### 已完成

- Foundation / Architecture
- UI System
- Global Filters
- KPI Rules / Repository
- KPI Formal Page
- KPI Actions Drilldown
- Adaptive Data Table
- Milestone Architecture Audit
- Risk & Compliance → Actions
- Risk & Compliance → Events
- Performance → Goals / Take Charge
- Stores V1
- Store Resolver historical rename compatibility
- Architecture Hardening
- Performance V1（实现、自动质量门与人工验收完成）
- Risk & Compliance → Environment V1
- Environment Detail Expansion
- Risk & Compliance → Certificates V1
- Events Analytics V1
- Actions Analytics V1
- Certificates Overview / Requirement chart
- Environment Analytics Metric Cards
- Dashboard shared Analytics presentation reuse
- Overview Data V1（正式 ScoreContribution 链路与 Server-side pooled aggregation）
- Production Import API V1（OpenAPI、运行时校验、批次生命周期与 fail-closed 接入边界）
- Enterprise Access V1 接入边界（可信主体、Bootstrap 与持久化端口）
- System Monitoring & Alerting V1 应用边界（事件、Incident、Outbox、管理页与 fail-closed 接入端口）
- 公司部署接入与上线检查清单（公司 AI 执行边界、验收证据与 NO-GO 条件）
- Production Integration UAT 验收矩阵（测试项、证据与签字模板）
- 公司数据源字段映射模板（逻辑 Contract、物理字段、键与 Coverage Proof）
- Production 切换与回滚 Runbook（检查点、停止条件、原子指针恢复与证据归档）

## Architecture Hardening

当前阶段收口 Production Source 替换边界：

- Async Repository Contract 与按领域分组的 public query
- Client → Server Action → server-only Repository factory
- raw `list*` 退出 Public Repository API
- `EhsFilterContext`、`resolveStoreReference` 中性命名
- Actions / Events Repository-side sorting 与 pagination
- latest-request-wins、loading / error 基础能力
- GitHub CI 基线

## 后续开发顺序

1. 为 Production 提供 authoritative Training required item catalog 与 Inspection expected task set，并替换 Mock provider；Overview contract 与聚合不变。
2. 生产历史若无法按月末 referenceDate 从可靠 Domain records 回算，再定义 snapshot；本阶段没有建立 snapshot。
3. ASTM KPI Drilldown（独立后续增强，不是 Overview 前置条件）。

依赖原则：Overview 只组合既有 Domain Results，不复制业务规则。Standard / Performance Mock 与正式 Overview 共用 Repository、Domain rules、contribution producer 和 aggregation。Production Import API 已定义；业务查询 API 与 snapshot 仍未冻结。ASTM KPI Drilldown 复用现有 normalized Event Repository。

## Performance & Scale Validation

### 当前：Standard Mock

继续使用包含 50 家门店、人工可读、deterministic 的 Standard Mock，作为日常开发、UI 验收、单元测试和业务规则验证的默认数据集。

### Performance V1

已完成独立 Performance Mock Profile：500 Stores、8,000 Actions、6,000 Events、8,000 Take Charge records，用于验证 400+ 门店规模下的：

- Global Store Filter
- Region / Area / Store 联动
- Store 搜索和多选
- Repository query
- Store Resolver
- KPI 约 500 Store rows
- Environment 500 Store coverage
- 页面响应性和交互性能

该 Profile 的月份、门店、事件类型和状态使用按字段独立的确定性采样；每个已支持月份都有记录，月度数量不再等量或受固定步长取余限制。事件类型覆盖每个支持月份。培训、检查、演练及源行动项关闭率结合月份和小区的模拟差异，使总览趋势和变化排名来自实际 Domain Results；保留少量缺失、无效和空值样本。固定 reference month 的生成结果可复现，记录总规模及 Standard 场景保持不变；不生成未来月份，不从明细重算源汇总值。

Standard Mock 仍保持默认；单元测试不默认加载 Performance Mock。

Mock Profile 的目标边界：

```text
Repository
├─ Mock Repository
│  ├─ standard
│  └─ performance
└─ Production Repository
```

`standard` 与 `performance` 是 Mock 数据 Profile；`production` 是独立 Repository。UI、Feature 和 Rules 不感知数据 Profile，Profile 仅在 server-only Dataset 边界切换。数据集 deterministic，独立规模测试不默认进入日常单元测试，也不代表 Production 容量承诺。

Performance V1 已完成 KPI summary / 按需 domain drilldown 优化、异步表格 resolved presentation、持久 Header / GlobalFilters 与 shared Tooltip 稳定化；自动质量门及人工视觉验收通过。

### Performance V2

在更多业务数据结构稳定后，扩展现有规模与领域覆盖，加入更多 Training、Drill、Inspection 等 records，用于验证：

- Repository 性能
- Rule Engine 性能
- Filter 性能
- Table 与 aggregation 性能

## Production、权限与上线

后期阶段顺序：

```text
主要业务页面完成
→ Production Adapter
→ 真实数据 Contract Validation
→ Performance / Scale Validation
→ Production authentication / authorization integration
→ UAT
→ Production
```

Access V1 Demo：completed。已建立 Mock identity、Base Grants、Manual Grants、Effective Access、Global User、Global Admin、server authorization 与 audit semantics；`/access` 提供“手动权限管理”和“操作日志”两个 Tab，自动权限由组织数据派生，Manual Grant 无截止时间和过期状态，服务端保护最后一名全局管理员。

Production Integration 当前待完成：企业数据库 Adapter 及事务保证、可信 SSO、M2M 身份、Manual Grant / Audit 与 Bootstrap 持久化、Production Repository、Monitoring 持久化、Email、Scheduler、authoritative required sets、Take Charge 年度 aggregate 物理字段映射、authorization-aware cache isolation 与部署安全验证。Take Charge 的逻辑输出与目标已确认；通用批量 API 不接收其年度 aggregate，由公司 Production Repository Adapter 直接读取并映射。接口、端口和 fail-closed 行为已实现；不得把测试内存 Adapter、Mock identity 或进程内数据视为生产能力。详见 `integration/corporate-ai-integration.md`。当前约束链路为：

```text
User Identity
→ Authorization Scope
→ Repository enforcement
→ Global Filter allowed scope
→ UI
```

全局用户与全局管理员及 Region / Area / Store 范围已定义；Production 身份与数据源接入仍待定。

## Roadmap 原则

1. 不为未来需求提前建立复杂 framework。
2. 新 shared abstraction 在第二个真实使用场景出现后再提取。
3. Standard Mock 保持小型、可读、deterministic。
4. Performance Mock 独立于日常开发数据。
5. Unit Tests 不默认使用 500 Store 大数据集。
6. Production Repository 与 Mock Profile 分离。
7. 每完成一个正式阶段后更新 Roadmap 状态。


## Architecture Hardening V1（2026-10-03）

已统一 KPI / Overview Domain Result、隔离 Store source quality、解耦 Goals YTD 与 Global Period、保留具体 diagnostic reason，并抽离 repository-independent contribution orchestration。规范化与 Store × Month / exact Period 索引复用；无结果缓存、API 或 Snapshot 实现。Production 前仍需 authoritative Training/Inspection requirements、Store/Period source coverage 与无法定位行的处理契约；API 物理结构、Production clock 与历史快照来源仍未冻结。性能复测与 regression evidence 见当前 `performance:v1` 和 Architecture Hardening tests。

## Overview UX Hardening（2026-10-03）

- 正式 Overview Detail 由当前 result 按实体 ID 解析；requested scope / Period 变化或 refresh 开始即关闭，不保留旧 DTO。复用 `useLatestAsyncQuery`，首次加载才显示 Skeleton；刷新保留 resolved presentation 与 `AnalyticsRefreshIndicator`，旧结果暂不可交互，无整页 fade。
- Matrix 点表示真实 Store / Area / Region；同级同坐标对象合并，成员数与名称对应对象而非其下属门店。单对象直接进入该对象详情；重叠对象复用 shadcn DropdownMenu，支持方向键、Enter / Space、Escape；Detail 关闭回到原触发器。图表保留实例，避免详情状态变化造成触发器丢失。
- 得分率为 `%`；得分率变化为百分点（`pp`）；门店总得分变化仍为原始分数。周期比较显示 `previousPeriodLabel`；最新月变化明确标注实际月份，不把周期维度变化标成“较上月”。
- 无可比较数据时显示现有文字空态，不绘制空 podium / matrix；缺少当前值或历史值的变化保留 null。Environment 明确显示“未纳入评分”。
- 仅修改 Overview presentation / View Model 与回归测试；未改变 Repository、Domain Result、ScoreContribution、12-point scoring 或生产接入边界。Final UI Polish 的视觉细节仍待后续处理。
