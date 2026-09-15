# Project Documentation

EHS Dashboard 用于统一查看门店 EHS 绩效、风险与合规记录及主数据。项目以明确的数据契约、Repository 边界、集中业务规则和共享 UI 语义保证各页面结论一致。

本文仅作为文档地图和开发入口，不承载业务规则或开发进度。

## Start Here

建议新开发者依次阅读：

1. [`../AGENTS.md`](../AGENTS.md)：开发边界与协作规则。
2. [`business-requirements.md`](business-requirements.md)：页面目的、业务范围和用户行为。
3. [`data-architecture.md`](data-architecture.md)：数据分层、职责和主数据关联方式。
4. [`data-contract.md`](data-contract.md)：Raw / normalized 字段、查询契约和数据边界。
5. [`metric-rules.md`](metric-rules.md)：当前模块的计算、阈值和空值规则。
6. [`status-dictionary.md`](status-dictionary.md)：状态归一化、标签和视觉语义。
7. [`ui-guidelines.md`](ui-guidelines.md)：通用界面原则。
8. [`ui-registry.md`](ui-registry.md)：已采用的组件、模式和共享能力。
9. [`development-roadmap.md`](development-roadmap.md)：当前进度与下一阶段。
10. [`decisions.md`](decisions.md)：已冻结决策及 supersede 关系。

涉及历史业务文档迁移时，再查阅 [`business-conflict-review.md`](business-conflict-review.md)。

## Documentation Map

| Document | Purpose |
| --- | --- |
| [`business-requirements.md`](business-requirements.md) | 定义页面解决的问题、已确认需求和用户可见行为；不定义代码架构或完整字段契约。 |
| [`data-contract.md`](data-contract.md) | 定义 Raw / normalized 数据、类型、空值、查询契约和边界；不记录 UI 样式或进度。 |
| [`data-architecture.md`](data-architecture.md) | 定义 Source、Repository、Rules、Feature 与 UI 的数据流和职责。 |
| [`metric-rules.md`](metric-rules.md) | 定义 KPI、Goals 与合规模块的计算、阈值、Period 和 availability 规则。 |
| [`status-dictionary.md`](status-dictionary.md) | 定义 Domain Status、归一化映射、中文标签、intent 和 StatusDisplay 语义。 |
| [`decisions.md`](decisions.md) | 记录已冻结决策、理由和 supersede 关系；不作为待办清单。 |
| [`ui-guidelines.md`](ui-guidelines.md) | 定义主题、密度、布局、交互和可访问性等通用 UI 原则。 |
| [`ui-registry.md`](ui-registry.md) | 登记已采用的 shadcn、shared、hook 和 feature pattern，防止重复实现。 |
| [`development-roadmap.md`](development-roadmap.md) | 记录已完成阶段、开发顺序和未来 Performance / Production / Permissions 阶段。 |
| [`business-conflict-review.md`](business-conflict-review.md) | 保存 2026-09-10 业务文档迁移审查快照；当前规则仍以专项文档和后续决策为准。 |

## Architecture at a Glance

```text
Client Feature → Server Action → Repository / Adapter → Source
```

- Client 不创建 Repository 或读取 Mock；业务规则不放在 UI。
- Production Adapter 未来替换 Repository implementation，上层 contract 保持稳定。
- Standard Mock 与 Production 使用相同的 normalized contract 边界。

完整说明见 [`data-architecture.md`](data-architecture.md)。

## Code Map

| Path | Responsibility |
| --- | --- |
| `src/app` | App Router 路由与页面组合。 |
| `src/features` | 业务页面 UI、view model 和 feature-local 行为。 |
| `src/data/contracts` | 中立的 normalized / query contracts。 |
| `src/data/repositories` | 数据访问、范围过滤与 availability 边界。 |
| `src/data/mock` | Standard / Performance Mock Dataset 与 server-only profile source。 |
| `src/lib/rules` | 纯业务规则和规范化结果类型。 |
| `src/components/ui` | shadcn primitives。 |
| `src/components/shared` | 已确认可跨项目复用的 UI 与 pattern。 |
| `src/hooks` | 共享 React 行为。 |
| `src/config` | 导航和全局筛选配置。 |

## Current Modules

模块完成状态、近期顺序和未来阶段只在 [`development-roadmap.md`](development-roadmap.md) 维护。

## Where Should I Change This?

| Change | Primary place |
| --- | --- |
| 新 source 字段 | `data-contract.md` 与 data layer |
| 新指标公式或阈值 | `metric-rules.md` 与 `src/lib/rules` |
| 新状态归一化或视觉语义 | `status-dictionary.md` 与 `StatusDisplay` |
| 新共享 UI pattern | `ui-registry.md` |
| 新架构或跨模块决策 | `decisions.md` |
| 新开发阶段或完成状态 | `development-roadmap.md` |

## Development Rules

修改前必须阅读并遵守 [`../AGENTS.md`](../AGENTS.md)。
