# EHS Dashboard Development Roadmap

- 更新日期：2026-09-22
- 职责：记录当前进度、后续顺序和阶段依赖；业务规则与架构决策仍以对应专项文档为准。

## 当前阶段

项目已完成基础架构及七个正式业务模块；Overview Demo 已有独立原型。Access Management V1 Demo：completed；Production Integration 为后续独立阶段。

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

1. Overview readiness / 业务范围确认
2. Overview V1
3. ASTM KPI Drilldown（独立后续增强，不是 Overview 前置条件）

依赖原则：Architecture Hardening、Performance V1、Environment V1 与 Certificates V1 已完成；Overview 组合既有 domain results，不复制业务规则。ASTM KPI Drilldown 复用现有 normalized Event Repository。Production Data Package Contract / Production Adapter 与帮助说明页面均留在 Overview 之后，不作为当前前置条件。

## Performance & Scale Validation

### 当前：Standard Mock

继续使用小型、人工可读、deterministic 的 Standard Mock，作为日常开发、UI 验收、单元测试和业务规则验证的默认数据集。

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

Production Integration TBD：Entra identity、稳定 tenantId + objectId、Production Identity Provider、Azure Function / App Service 等受保护 API、SharePoint protected JSON API / secure data access、Manual Grant 与 Audit 持久化（数据库或 SharePoint List）、production first-admin bootstrap、authorization-aware cache isolation、ASPX / SPFx 部署安全验证。不得把 Demo Mock identity 或进程内授权与审计数据视为生产能力。若采用静态 ASPX 托管，独立 server authorization runtime 仍为必要条件。当前约束链路为：

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
