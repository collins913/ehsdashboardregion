# EHS Dashboard Development Roadmap

- 更新日期：2026-09-13
- 职责：记录当前进度、后续顺序和阶段依赖；业务规则与架构决策仍以对应专项文档为准。

## 当前阶段

项目已完成基础架构和首批正式业务页面，当前进入其余业务模块的逐步实现阶段。

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
- Store Resolver historical rename compatibility

## 近期开发顺序

1. Stores
2. ASTM KPI Drilldown
3. Risk & Compliance → Environment
4. Risk & Compliance → Certificates
5. Overview

依赖原则：Overview 在底层业务模块稳定后实现；ASTM KPI Drilldown 复用现有 normalized Event Repository；Stores 进一步稳定后再启动首轮规模验证。

## Performance & Scale Validation

### 当前：Standard Mock

继续使用小型、人工可读、deterministic 的 Standard Mock，作为日常开发、UI 验收、单元测试和业务规则验证的默认数据集。

### Performance V1

在 Stores 等主要结构进一步稳定后，引入独立 Performance Mock Profile，约 500 Stores，用于验证真实 400+ 门店规模下的：

- Global Store Filter
- Region / Area / Store 联动
- Store 搜索和多选
- Repository query
- Store Resolver
- KPI 约 500 Store rows
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

`standard` 与 `performance` 是 Mock 数据 Profile；`production` 是独立 Repository。UI、Feature 和 Rules 不感知数据 Profile，Profile 仅在数据层 / Repository 创建边界切换。本阶段只记录方向，不实施。

### Performance V2

在 Actions、Events、Goals 等主要数据结构进一步稳定后，扩展为约 500 Stores 及数千至数万条 Actions、Events、Training、Drill、Inspection、Goals records，用于验证：

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
→ Authentication / Authorization
→ UAT
→ Production
```

权限管理不提前实现。未来约束链路为：

```text
User Identity
→ Authorization Scope
→ Repository enforcement
→ Global Filter allowed scope
→ UI
```

具体 RBAC、角色和权限规则保持 TBD。

## Roadmap 原则

1. 不为未来需求提前建立复杂 framework。
2. 新 shared abstraction 在第二个真实使用场景出现后再提取。
3. Standard Mock 保持小型、可读、deterministic。
4. Performance Mock 独立于日常开发数据。
5. Unit Tests 不默认使用 500 Store 大数据集。
6. Production Repository 与 Mock Profile 分离。
7. 每完成一个正式阶段后更新 Roadmap 状态。
